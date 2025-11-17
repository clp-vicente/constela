import google.generativeai as genai

class GeminiClient:
    def __init__(self, api_key, model_name='gemini-2.5-flash'):
        self.api_key = api_key
        self.model_name = model_name
        self.system_instruction = None
        self.temperature = None  # Default will be set by Gemini API if None
        self.max_output_tokens = None # Default will be set by Gemini API if None
        self.model = None
        self.chat = None
        try:
            genai.configure(api_key=self.api_key)
            self._update_model_and_chat()
        except Exception as e:
            print(f"ERROR: No se pudo configurar la API de Gemini: {e}")
            self.model = None

    def _update_model_and_chat(self):
        try:
            generation_config = {}
            if self.temperature is not None:
                generation_config["temperature"] = self.temperature
            if self.max_output_tokens is not None:
                generation_config["max_output_tokens"] = self.max_output_tokens

            self.model = genai.GenerativeModel(
                model_name=self.model_name,
                system_instruction=self.system_instruction,
                generation_config=generation_config if generation_config else None
            )
            self.start_new_chat()
        except Exception as e:
            print(f"ERROR: No se pudo actualizar el modelo: {e}")
            self.model = None
            self.chat = None

    def start_new_chat(self):
        if self.model:
            self.chat = self.model.start_chat(history=[])

    def load_chat_history(self, history):
        if self.model:
            self.chat = self.model.start_chat(history=history)

    def send_message(self, content, system_instruction=None, temperature=None, max_output_tokens=None):
        # Check if any generation config parameters have changed
        config_changed = False
        if self.system_instruction != system_instruction:
            self.system_instruction = system_instruction
            config_changed = True
        if self.temperature != temperature:
            self.temperature = temperature
            config_changed = True
        if self.max_output_tokens != max_output_tokens:
            self.max_output_tokens = max_output_tokens
            config_changed = True

        if config_changed:
            self._update_model_and_chat()

        if not self.chat:
            return {"error": "El cliente de Gemini no se ha inicializado."}
        
        try:
            response = self.chat.send_message(content)
            return {"text": response.text}
        except Exception as e:
            return {"error": f"Ocurrió un error: {e}"}