import sys
import json
import io

from gemini_client import GeminiClient

API_KEY = "reemplazar_con_api_key"

def send_to_stdout(data_dict):
    try:
        message = json.dumps(data_dict)
        sys.stdout.buffer.write(message.encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
        sys.stdout.flush()
    except Exception as e:
        fallback_error = json.dumps({"error": f"Error interno en el backend al enviar datos: {str(e)}"})
        sys.stdout.buffer.write(fallback_error.encode('utf-8'))
        sys.stdout.buffer.write(b'\n')
        sys.stdout.flush()

def main():
    sys.stdin = io.TextIOWrapper(sys.stdin.buffer, encoding='utf-8')

    model_name = sys.argv if len(sys.argv) > 1 else 'gemini-1.5-flash'
    
    gemini_client = GeminiClient(api_key=API_KEY, model_name=model_name)
    
    if not gemini_client.model:
        send_to_stdout({"error": "API Key inválida o modelo incorrecto."})
        sys.exit(1)

    send_to_stdout({"status": "ready"})

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break
            
            request = json.loads(line)

            action = request.get("action")
            if action == 'reset':
                gemini_client.start_new_chat()
                continue
            
            elif action == 'load_history':
                history_from_js = request.get("history", [])
                
                python_compatible_history = []
                for message in history_from_js:
                    if "role" in message and "parts" in message and isinstance(message["parts"], list):
                        transformed_parts = [part.get("text") for part in message["parts"] if "text" in part]
                        python_compatible_history.append({
                            "role": message["role"],
                            "parts": transformed_parts
                        })
                
                gemini_client.load_chat_history(python_compatible_history)
                continue
            
            user_input = request.get("prompt")
            if user_input:
                response = gemini_client.send_message(user_input)
                send_to_stdout(response)

        except Exception as e:
            send_to_stdout({"error": str(e)})

if __name__ == "__main__":
    main()