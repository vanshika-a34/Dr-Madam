import os
import xml.etree.ElementTree as ET

import requests
from langchain_core.messages import HumanMessage, SystemMessage, ToolMessage
from langchain_core.tools import tool


# ---------------------------------------------------------
# MedlinePlus tool
# ---------------------------------------------------------
@tool
def medical_information(topic: str) -> str:
    """
    Search MedlinePlus for general medical information about a topic.
    Provides educational information only and does not diagnose or prescribe.
    """
    url = "https://wsearch.nlm.nih.gov/ws/query"

    params = {
        "db": "healthTopics",
        "term": topic,
        "retmax": 3,
        "rettype": "brief",
    }

    try:
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        root = ET.fromstring(response.text)
        results = []

        for document in root.findall(".//document"):
            title = ""
            summary = ""
            page_url = document.attrib.get("url", "")

            for content in document.findall("content"):
                name = content.attrib.get("name")
                text = "".join(content.itertext()).strip()

                if name == "title":
                    title = text
                elif name == "full-summary":
                    summary = text

            if title or summary:
                results.append(
                    {
                        "title": title,
                        "summary": summary,
                        "url": page_url,
                    }
                )

        if not results:
            return f"No medical information found on MedlinePlus for: {topic}"

        output = f"Medical information from MedlinePlus for '{topic}':\n\n"

        for i, result in enumerate(results, 1):
            output += f"{i}. {result['title']}\n"
            output += f"{result['summary']}\n"
            output += f"Source: {result['url']}\n\n"

        output += (
            "Important: This information is for educational purposes only. "
            "It does not provide a diagnosis or medical prescription."
        )

        return output

    except requests.RequestException as e:
        return f"Unable to access MedlinePlus: {str(e)}"

    except ET.ParseError:
        return "Unable to process the medical information returned by MedlinePlus."


# ---------------------------------------------------------
# LLM setup
# ---------------------------------------------------------
_model = None
_model_with_tools = None


def _get_model():
    global _model, _model_with_tools

    if _model is None:
        api_key = os.getenv("OPENROUTER_API_KEY")
        if not api_key:
            raise ValueError("OPENROUTER_API_KEY is not set")

        try:
            from langchain_openrouter import ChatOpenRouter
            _model = ChatOpenRouter(
                model="z-ai/glm-5.3-flash",
                base_url="https://openrouter.ai/api/v1",
                api_key=api_key,
                temperature=0,
            )
        except (ImportError, Exception):
            from langchain_openai import ChatOpenAI
            _model = ChatOpenAI(
                model="z-ai/glm-5.3-flash",
                openai_api_base="https://openrouter.ai/api/v1",
                openai_api_key=api_key,
                temperature=0,
            )

        _model_with_tools = _model.bind_tools([medical_information])

    return _model_with_tools


# ---------------------------------------------------------
# AI response
# ---------------------------------------------------------
SYSTEM_PROMPT = """You are a knowledgeable medical information voice assistant.

Your job is to answer any medical question the user asks, drawing on your
own medical knowledge.

When relevant, use the medical_information tool to supplement your answer
with verified information from MedlinePlus. If the tool returns no results
or if the question falls outside what MedlinePlus covers, still provide a
helpful, accurate answer from your own knowledge.

Important rules:
- Do not diagnose diseases.
- Do not prescribe medicines.
- Do not replace a healthcare professional.
- Since your response will be spoken aloud, keep the answer concise.
- Use simple language.
- Do not use Markdown.
- Avoid long lists.
- Always remind the user to consult a healthcare professional for
  personal medical concerns.
"""


def get_medical_response(user_text):
    model_with_tools = _get_model()

    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=user_text),
    ]

    response = model_with_tools.invoke(messages)

    tool_results = []

    if response.tool_calls:
        messages.append(response)

        for tool_call in response.tool_calls:
            if tool_call["name"] == "medical_information":
                tool_result = medical_information.invoke(tool_call["args"])

                tool_results.append(tool_result)

                messages.append(
                    ToolMessage(
                        content=str(tool_result),
                        tool_call_id=tool_call["id"],
                    )
                )

        final_response = model_with_tools.invoke(messages)
        answer = final_response.content

    else:
        answer = response.content

    return answer, tool_results
