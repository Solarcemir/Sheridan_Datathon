# To run this code you need to install the following dependencies:
# pip install google-genai

import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import asyncio
import requests

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

async def chat():
    client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))
    model = "gemini-flash-latest"

    data = fetch_gta_updates()
    print(f"Loaded {len(data)} incidents.\n")

    print("\nToronto Live Crime Data Chat Started! Type 'exit' to stop.\n")
    messages = []

    while True:
        user_input = input("You: ")
        if user_input.lower() == "exit":
            break

        messages.append(
            types.Content(role="user",
                parts=[types.Part.from_text(text=user_input)]
            )
        )

        response_text = ""

        generate_content_config = types.GenerateContentConfig(
            system_instruction=[
                types.Part.from_text(
                    text=f"""
                    You are an assistant that looks at recent events in the streets of Toronto.
                    Your task is to alert the user of any relevant incidents, based on what the user is currently doing.
                    The user can be either 'Driving/Bus Riding', 'Walking', or 'Bicycle Riding' on a specified street.
                    Respond ONLY this incident data: {data}
                    Do not make up anything.
                    If the user is 'Driving/Bus Riding', alert it of incidents no longer than 2 hours ago.
                    If the user is 'Walking', alert it of incidents no longer than 7 hours ago.
                    If the user is 'Bicycle Riding', alert if of incidents no longer than 5 hours ago.
                    If no incident is related, just say 'Area is Safe: No recent incidents reported.'
                    Response should be straight forward and customized for the user.
                    """
                )
            ]
        )

        for chunk in client.models.generate_content_stream(
            model=model,
            contents=messages,
            config=generate_content_config,
        ):
            if chunk.text:
                print(chunk.text, end="")
                response_text += chunk.text

        print("\n")

        messages.append(
            types.Content(role="model",
                parts=[types.Part.from_text(text=response_text)]
            )
        )


if __name__ == "__main__":
    asyncio.run(chat())
