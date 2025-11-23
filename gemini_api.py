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
    model = "gemini-2.0-flash-exp"

    messages = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_input)]
        )
    ]

    response_text = ""

    generate_content_config = types.GenerateContentConfig(
        system_instruction=[
            types.Part.from_text(
                text=f"""
                You are an assistant that looks at recent events in the streets of Toronto.
                Your task is to alert the user of any relevant incidents, based on what the user is currently doing.
                The user can be either 'Driving/Bus Riding', 'Walking', or 'Bicycle Riding' on a specified street.
                Respond ONLY this incident data: {incidents}
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

    return response_text

if __name__ == "__main__":
    # Read JSON input from stdin
    input_data = json.load(sys.stdin)
    street = input_data.get("street", "")
    time = input_data.get("time", "")
    situation = input_data.get("situation", "")

    # Construct user_input for Gemini
    user_input = f"Street: {street}, Time: {time}, Situation: {situation}"

    incidents = fetch_gta_updates()

    # Run Gemini chat
    response_text = asyncio.run(chat(user_input, incidents))

    # Output JSON so Node server can read it
    print(json.dumps({"reply": response_text}))
