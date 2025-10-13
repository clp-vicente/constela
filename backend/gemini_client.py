import google.generativeai as genai

class GeminiClient:
    def __init__(self, api_key, model_name='gemini-2.5-flash'):
        self.api_key = api_key
        self.model = None
        self.chat = None
        try:
            genai.configure(api_key=self.api_key)
            self.model = genai.GenerativeModel(model_name)
            self.start_new_chat()
        except Exception as e:
            print(f"ERROR: No se pudo configurar la API de Gemini: {e}")
            self.model = None

    def start_new_chat(self):
        if self.model: self.chat = self.model.start_chat(history=[])

    def load_chat_history(self, history):
        if self.model:
            self.chat = self.model.start_chat(history=history)

    def send_message(self, content):
        if not self.chat: return {"error": "El cliente de Gemini no se ha inicializado."}
        try:
            response = self.chat.send_message(content)
            return {"text": response.text}
        except Exception as e: return {"error": f"Ocurrió un error: {e}"}