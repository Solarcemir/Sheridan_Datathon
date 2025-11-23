# To run this code you need to install the following dependencies:
# pip install google-genai
# pip install playwright
# pip install bs4

import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import asyncio
import requests
import json
import sys

load_dotenv()

def fetch_gta_updates():
    url = "https://gtaupdate.com/"
    response = requests.get(url)

    if response.status_code != 200:
        print("Error: Failed to fetch page")
        return []

    soup = BeautifulSoup(response.text, "html.parser")

    table = soup.find("table")
    if not table:
        print("Error: Table not found")
        return []

    tbody = table.find("tbody")
    rows = tbody.find_all("tr")

    incidents = []

    for row in rows:
        cols = row.find_all("td")
        if len(cols) < 3:
            continue  # skip empty rows

        time = cols[0].text.strip()
        district = cols[1].text.strip()
        details = cols[2].text.strip()

        incidents.append({
            "time": time,
            "district": district,
            "details": details
        })

    return incidents

async def chat(user_input, incidents):
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    model = "gemini-flash-latest"

    messages = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_input)]
        )
    ]

    generate_content_config = types.GenerateContentConfig(
        system_instruction=[
            types.Part.from_text(
                text=f"""
                You are an assistant that looks at recent street incidents in Toronto.
                The user will ask something related to a specific area in Toronto.
                You will be given a list of recent incidents within the following data: {incidents}.
                Based on the area the user inputs, identify any recent incidents in that area.
                Do NOT make up information.
                Respond strictly as JSON with:
                {{
                  "message": "...",
                  "longitud": "...",
                  "latitud": "..."
                }}
                """
            )
        ]
    )

    response = client.models.generate_content(
        model=model,
        contents=messages,
        config=generate_content_config,
    )

    # Entire text output
    response_text = response.text

    try:
        # Try to parse as JSON
        data = json.loads(response_text)
        return {
            "answer": data.get("message", ""),
            "coords": {
                "longitud": data.get("longitud", ""),
                "latitud": data.get("latitud", "")
            },
            "recent_news": data.get("recent_news", "")
        }
    except:
        # If model returns non-JSON, return raw
        return {
            "answer": response_text,
            "coords": "",
            "recent_news": ""
        }


if __name__ == "__main__":
    input_data=json.load(sys.stdin)
    question=input_data.get("question","")
    incidents=fetch_gta_updates()
    response_json=asyncio.run(chat(question, incidents))
    print(json.dumps(response_json))
