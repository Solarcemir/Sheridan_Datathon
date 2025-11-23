# To run this code you need to install the following dependencies:
# pip install google-genai

import base64
import os
from dotenv import load_dotenv
from google import genai
from google.genai import types
from google.genai.types import UploadFileConfig
import pandas as pd

load_dotenv()

def generate():
    client = genai.Client(
        api_key=os.getenv("GEMINI_API_KEY"),
    )

    # Load file for API to read from
    df = pd.read_csv("Neighbourhood_Crime_Rates_Open_Data_6759951416839911996.csv")

    # Convert to text table
    csv_text = df.to_string(index=False)

    # Conversation history
    messages = [] 

    model = "gemini-flash-latest"

    print("Toronto Crime Chat Started! Type 'exit' to stop.\n")

    while True:
        user_input = input("You: ")
        if user_input.lower() == "exit":
            break

        # Add user message to history
        messages.append(
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=user_input)]
            )
        )

        response_text = ""

        generate_content_config = types.GenerateContentConfig(
            system_instruction=[
                types.Part.from_text(text=f"""You are an assistant that explains safety levels between Toronto neighborhoods.  
                                            Use only the data below.
                                            Data: {csv_text}  
                                            Do NOT make up any numbers.  
                                            The user will ask things like (This is an example!): 'How dangerous is Downsview compared to West Rouge?' 
                                            Give percentages or counts where relevant, based only on the CSV.
                                            Give answers that are easy and short for a normal human to understand.""")
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

        # Add response to history
        messages.append(
            types.Content(
                role="model",
                parts=[types.Part.from_text(text=response_text)]
            )
        )

if __name__ == "__main__":
    generate()
