from flask import Flask, render_template, request, jsonify
# import whisper
import os
# from openai import OpenAI

class TranscriptionApp:
    def __init__(self):
        self.app = Flask(__name__)
        # self.model = whisper.load_model("small")  # モデル指定

        self.setup_routes()

    def setup_routes(self):
        self.app.add_url_rule('/', 'index', self.index)
        self.app.add_url_rule('/transcribe', 'transcribe', self.transcribe, methods=['POST'])
        self.app.add_url_rule('/create_minutes', 'create_minutes', self.create_minutes, methods=['POST'])  # 追加
        self.app.add_url_rule('/prompt', 'get_prompt', self.get_prompt, methods=['GET'])
        self.app.add_url_rule('/favicon.ico', 'favicon', self.favicon)

    def index(self):
        return render_template('index.html')

    def transcribe(self):
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400

        # 一時ファイルとして保存
        file_path = os.path.join('temp', file.filename)
        file.save(file_path)

        # 音声ファイルの転写
        # result = self.model.transcribe(file_path, verbose=True, fp16=False, language="ja")
        # transcribed_text = result['text']  # 生データ（文字おこし結果）

        # 一時ファイルを削除
        os.remove(file_path)

        # クライアント側から送られたプロンプトデータを使用する
        prompt_text = request.form.get('prompt')  # クライアントからプロンプトを取得

        if not prompt_text:
            prompt_text = '以下の内容を議事録形式で詳細にまとめてください。'  # デフォルトのプロンプト

        text = 'Whisoe'

        # messages = [{"role": "system", "content": text}]

        # completion = self.client.chat.completions.create(
        #     model="gpt-4o-mini",
        #     messages=messages
        # )

        # JSONで生データと要約データを一緒に返す
        return jsonify({
            'transcription': '議事録・文字起こし',
            'raw_transcription': '議事録・文字起こし'
        })

    def create_minutes(self):
        # クライアントからの文字おこしデータを取得
        transcription = request.form.get('transcription')
        prompt_text = request.form.get('prompt')  # プロンプトを取得

        if not transcription:
            return jsonify({'error': 'No transcription data provided'}), 400

        if not prompt_text:
            prompt_text = '以下の内容を議事録形式で詳細にまとめてください。'  # デフォルトのプロンプト

        # 議事録作成用のプロンプトを生成
        text = f'{prompt_text} {transcription}'

        messages = [{"role": "system", "content": f"{text}"}]

        # completion = self.client.chat.completions.create(
        #     model="gpt-4o-mini",
        #     messages=messages
        # )

        # 議事録を生成して返す
        return jsonify({
            'transcription': '議事録のみ'
        })

    def get_prompt(self):
        # prompt.txtファイルの内容を読み込んで返す
        try:
            with open('prompt.txt', 'r', encoding='utf-8') as file:
                prompt_content = file.read()
            return jsonify({'prompt': prompt_content})
        except FileNotFoundError:
            return jsonify({'error': 'prompt.txtファイルが見つかりませんでした。'}), 404

    def favicon(self):
        return '', 204  # No Content

# クラスの外でサーバーを立ち上げる処理
transcription_app = TranscriptionApp()
app = transcription_app.app

if __name__ == '__main__':
    os.makedirs('temp', exist_ok=True)
    app.run(debug=True, host='0.0.0.0', port=5001)