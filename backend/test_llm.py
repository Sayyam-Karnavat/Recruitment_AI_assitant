import os
import json
import urllib.request

# ==========================================
# AZURE CONFIGURATION
# ==========================================
# Using the credentials you provided in the previous code block
api_key = os.environ.get("AZURE_OPENAI_API_KEY")
endpoint = os.environ.get("AZURE_OPENAI_ENDPOINT")



api_version_deployments = "2024-12-01-preview" # Version for listing deployments
api_version_chat = "2024-12-01-preview" # Version for generating chat responses

# The Improved Prompt
video_prompt = """
Please create a highly detailed, scene-by-scene video script for a 30-second promotional video.
"""

def find_working_deployment():
    """Probes the chat endpoint with common deployment names to find a working one."""
    # These are the most common deployment names people use in Azure AI Studio
    common_names = [
        "gpt-4o", "gpt4o", "gpt-4", "gpt4", 
        "gpt-4-turbo", "gpt-35-turbo", "gpt-3.5-turbo",
        "gpt-4o-mini", "gpt4o-mini", "video", "sora"
    ]
    
    base_endpoint = endpoint.rstrip('/')
    headers = {"Content-Type": "application/json", "api-key": api_key}
    
    # A very tiny payload just to see if the deployment exists
    test_data = {
        "messages": [{"role": "user", "content": "test"}],
        "max_tokens": 1
    }

    print(f"🔍 Probing Azure endpoint for valid deployments...\n")
    
    for name in common_names:
        url = f"{base_endpoint}/openai/deployments/{name}/chat/completions?api-version={api_version_chat}"
        try:
            req = urllib.request.Request(url, data=json.dumps(test_data).encode("utf-8"), headers=headers)
            with urllib.request.urlopen(req) as response:
                if response.status == 200:
                    print(f"✅ Found working deployment: '{name}'")
                    return name
        except urllib.error.HTTPError as e:
            # 404 means the deployment doesn't exist. 
            # 400 (Bad Request) means the deployment exists but the payload/model is misconfigured (still a valid deployment name!)
            if e.code == 404:
                continue # Try the next one
            elif e.code == 400:
                print(f"✅ Found working deployment (returned 400, but exists): '{name}'")
                return name
            else:
                print(f"⚠️ Deployment '{name}' returned status {e.code}: {e.read().decode()}")
        except Exception as e:
            pass # Ignore connection errors and keep looping
            
    print("❌ Could not find any working deployments using common names.")
    return None

def generate_with_gpt4o(deployment_name, prompt):
    """Fallback: Generates a highly detailed Video Storyboard using GPT-4o"""
    print(f"\n🎬 Proceeding with text model '{deployment_name}' to generate a Video Storyboard/Script...")
    
    base_endpoint = endpoint.rstrip('/')
    url = f"{base_endpoint}/openai/deployments/{deployment_name}/chat/completions?api-version={api_version_chat}"
    headers = {"Content-Type": "application/json", "api-key": api_key}

    data = {
        "messages": [
            {"role": "system", "content": "You are an expert AI Video Producer and Creative Director."},
            {"role": "user", "content": f"Please turn this creative brief into a highly detailed, scene-by-scene video script and prompt list for an AI Video generator:\n\n{prompt}"}
        ],
        "max_tokens": 2000,
        "temperature": 0.7
    }

    try:
        req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers)
        with urllib.request.urlopen(req) as response:
            if response.status == 200:
                result = json.loads(response.read().decode())["choices"][0]["message"]["content"]
                print("\n✅ STORYBOARD GENERATED:\n")
                print(result)
            else:
                print(f"❌ Failed! Status Code: {response.status}")
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Generation Error: {e.code} - {e.read().decode()}")
    except Exception as e:
        print(f"❌ Generation Error: {e}")

if __name__ == "__main__":
    working_deployment = find_working_deployment()
    
    if working_deployment:
        generate_with_gpt4o(working_deployment, video_prompt)
    else:
        print("\n❌ Failed to automatically detect your deployment name.")
        print("Please log into Azure AI Studio -> Deployments, and find the exact name of your deployment.")
