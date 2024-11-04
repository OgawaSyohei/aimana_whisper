document.getElementById('uploadButton').addEventListener('click', function() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    // プロンプトタブの内容を取得
    const promptText = document.getElementById('promptTextarea').value;
    console.log(promptText)

    const rawTranscriptionResult = document.getElementById('rawTranscriptionResult').innerText;  // 既にある文字おこしデータ

    // 既に文字おこしされたデータがある場合は、議事録作成のみを実施
    if (rawTranscriptionResult.trim() !== "") {
        createMinutesFromTranscription(rawTranscriptionResult, promptText);  // プロンプトを一緒に送信
        return;
    }

    // ファイルが選択されていない場合は警告
    if (!file) {
        alert('ファイルを選択してください');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', promptText);  // プロンプトテキストも一緒に送信

    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block'; // ローディング表示

    // 文字おこし処理をサーバーにリクエスト
    fetch('/transcribe', {
        method: 'POST',
        body: formData,
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('ネットワークエラーが発生しました');
        }
        return response.json();
    })
    .then(data => {
        loadingElement.style.display = 'none'; // ローディング非表示

        if (data.error) {
            document.getElementById('rawTranscriptionResult').innerText = data.error;
            document.getElementById('transcriptionResult').innerText = data.error;
        } else {
            // 文字おこしと議事録の内容をそれぞれ表示し、localStorageに保存
            document.getElementById('rawTranscriptionResult').innerText = data.raw_transcription;
            document.getElementById('transcriptionResult').innerText = data.transcription;
            saveTranscription(data.transcription, data.raw_transcription);  // 保存
        }
    })
    .catch(error => {
        loadingElement.style.display = 'none'; // ローディング非表示
        document.getElementById('rawTranscriptionResult').innerText = error.message;
        document.getElementById('transcriptionResult').innerText = error.message;
    });
});

// デフォルトプロンプトに戻すチェックボックス
document.getElementById('defaultPromptCheckbox').addEventListener('change', function(event) {
    const isChecked = event.target.checked;
    const promptTextarea = document.getElementById('promptTextarea');

    if (isChecked) {
        // デフォルトのプロンプトを読み込み
        fetch('/prompt')
            .then(response => {
                if (!response.ok) {
                    throw new Error('デフォルトプロンプトの読み込みに失敗しました');
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    promptTextarea.value = data.error;
                } else {
                    promptTextarea.value = data.prompt;
                    // promptTextarea.disabled = true; // 編集不可
                }
            })
            .catch(error => {
                promptTextarea.value = error.message;
            });
    } else {
        promptTextarea.disabled = false; // 編集可能に戻す
        loadPrompt(); // 保存されたプロンプトを再度ロード
    }
});


// 議事録作成処理
function createMinutesFromTranscription(transcriptionText, promptText) {
    const formData = new FormData();
    formData.append('transcription', transcriptionText);  // 既存の文字おこしデータを送信
    formData.append('prompt', promptText);  // プロンプトを送信

    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block'; // ローディング表示

    fetch('/create_minutes', {
        method: 'POST',
        body: formData,
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('議事録作成中にエラーが発生しました');
        }
        return response.json();
    })
    .then(data => {
        loadingElement.style.display = 'none'; // ローディング非表示
        document.getElementById('transcriptionResult').innerText = data.transcription;
        saveTranscription(data.transcription, transcriptionText);  // 議事録と文字おこしの保存
    })
    .catch(error => {
        loadingElement.style.display = 'none'; // ローディング非表示
        document.getElementById('transcriptionResult').innerText = error.message;
    });
}

// タブの切り替え
document.getElementById('rawTab').addEventListener('click', function() {
    switchTab('raw');
});

document.getElementById('transcriptionTab').addEventListener('click', function() {
    switchTab('transcription');
});

document.getElementById('promptTab').addEventListener('click', function() {
    switchTab('prompt'); // プロンプトタブの切り替え
    loadPrompt(); // プロンプトの内容を読み込む
});

document.getElementById('participantTab').addEventListener('click', function() {
    switchTab('participant');
});


function switchTab(tab) {
    const tabs = {
        'raw': {
            tabElement: document.getElementById('rawTab'),
            contentElement: document.getElementById('rawContent')
        },
        'transcription': {
            tabElement: document.getElementById('transcriptionTab'),
            contentElement: document.getElementById('transcriptionContent')
        },
        'prompt': {
            tabElement: document.getElementById('promptTab'),
            contentElement: document.getElementById('promptContent')
        },
        'participant': {
            tabElement: document.getElementById('participantTab'),
            contentElement: document.getElementById('participantContent')
        }
    };

    // すべてのタブとコンテンツから 'active' クラスを削除し、非表示にする
    Object.values(tabs).forEach(({ tabElement, contentElement }) => {
        tabElement.classList.remove('active');
        contentElement.classList.remove('active');
        contentElement.style.display = 'none'; // 非表示に設定
    });

    // 選択されたタブとそのコンテンツに 'active' クラスを追加し、表示
    if (tabs[tab]) {
        tabs[tab].tabElement.classList.add('active');
        tabs[tab].contentElement.classList.add('active');
        tabs[tab].contentElement.style.display = 'block'; // 表示に設定
    }
}



function loadPrompt() {
    // localStorageからプロンプトを読み込む
    const savedPrompt = localStorage.getItem('prompt');
    if (savedPrompt) {
        document.getElementById('promptTextarea').value = savedPrompt;
    } else {
        fetch('/prompt')
            .then(response => {
                if (!response.ok) {
                    throw new Error('prompt.txtの読み込みに失敗しました');
                }
                return response.json();
            })
            .then(data => {
                if (data.error) {
                    document.getElementById('promptTextarea').value = data.error;
                } else {
                    document.getElementById('promptTextarea').value = data.prompt;
                }
            })
            .catch(error => {
                document.getElementById('promptTextarea').value = error.message;
            });
    }
}

// プロンプトを保存する関数
function savePrompt() {
    const promptText = document.getElementById('promptTextarea').value;
    localStorage.setItem('prompt', promptText); // localStorageに保存
}

// プロンプトテキストエリアにイベントリスナーを追加
document.getElementById('promptTextarea').addEventListener('input', savePrompt);

// 初期化時にプロンプトを読み込む
loadPrompt();

// ファイル選択時にファイル名を表示
document.getElementById('fileInput').addEventListener('change', function() {
    const fileInput = document.getElementById('fileInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');

    if (fileNameDisplay) {
        if (fileInput.files.length > 0) {
            const fileName = fileInput.files[0].name;
            fileNameDisplay.textContent = '音声ファイル：' + fileName;

            // 新しいファイルが選択された場合、Whisperの処理を開始
            // triggerWhisperProcessing();
        } else {
            fileNameDisplay.textContent = '音声ファイル：';
        }
    }
});

document.addEventListener("DOMContentLoaded", function() {
    // 初期状態で文字おこしタブのみをアクティブにする
    switchTab("raw");

    const advancedCheckbox = document.getElementById("advancedModeCheckbox");
    const participantTab = document.getElementById("participantTab");
    const promptTab = document.getElementById("promptTab");
    const showRawTabCheckbox = document.getElementById("showRawTabCheckbox");
    const rawTab = document.getElementById("rawTab");
    const rawContent = document.getElementById("rawContent");

    // 初期状態で初心者タブを表示
    participantTab.style.display = "block";
    promptTab.style.display = "none";

    // チェックボックスの状態が変わったときのイベント
    advancedCheckbox.addEventListener("change", function() {
        if (advancedCheckbox.checked) {
            // 上級者モードが選択されたとき、初心者タブを非表示にし、上級者タブを表示
            participantTab.style.display = "none";
            promptTab.style.display = "block";
            switchTab("prompt");  // 上級者タブをアクティブにする
        } else {
            // 初心者モードが選択されたとき、上級者タブを非表示にし、初心者タブを表示
            participantTab.style.display = "block";
            promptTab.style.display = "none";
            switchTab("participant");  // 初心者タブをアクティブにする
        }
    });

        // チェックボックスの初期状態に応じて「文字おこし」タブを表示
        if (showRawTabCheckbox.checked) {
            rawTab.style.display = "block";
        } else {
            rawTab.style.display = "none";
            rawContent.style.display = "none";  // タブを非表示にする際、内容も非表示に
        }
    
        // チェックボックスが変更されたときに「文字おこし」タブを表示・非表示にする
        showRawTabCheckbox.addEventListener("change", function() {
            if (showRawTabCheckbox.checked) {
                rawTab.style.display = "block";
            } else {
                rawTab.style.display = "none";
                if (rawTab.classList.contains("active")) {
                    // 他のタブに切り替え（議事録タブに切り替える例）
                    switchTab("transcription");
                }
            }
        });
});


// Whisperの処理を開始する関数
function triggerWhisperProcessing() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert('ファイルを選択してください');
        return;
    }

    const promptText = document.getElementById('promptTextarea').value;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('prompt', promptText);

    const loadingElement = document.getElementById('loading');
    loadingElement.style.display = 'block'; // ローディング表示

    // 文字おこし処理をサーバーにリクエスト
    fetch('/transcribe', {
        method: 'POST',
        body: formData,
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('ネットワークエラーが発生しました');
        }
        return response.json();
    })
    .then(data => {
        loadingElement.style.display = 'none'; // ローディング非表示

        if (data.error) {
            document.getElementById('rawTranscriptionResult').innerText = data.error;
            document.getElementById('transcriptionResult').innerText = data.error;
        } else {
            // 文字おこしと議事録の内容をそれぞれ表示
            document.getElementById('rawTranscriptionResult').innerText = data.raw_transcription;
            document.getElementById('transcriptionResult').innerText = data.transcription;
            saveTranscription(data.transcription, data.raw_transcription);  // 保存
        }
    })
    .catch(error => {
        loadingElement.style.display = 'none'; // ローディング非表示
        document.getElementById('rawTranscriptionResult').innerText = error.message;
        document.getElementById('transcriptionResult').innerText = error.message;
    });
}


// 文字おこしと議事録の保存
function saveTranscription(transcription, rawTranscription) {
    if (transcription) {
        localStorage.setItem('transcription', transcription); // 議事録の保存
    }
    if (rawTranscription) {
        localStorage.setItem('rawTranscription', rawTranscription); // 文字起こしの保存
    }
}

// 保存された議事録と文字おこしを読み込む
function loadSavedTranscription() {
    const savedTranscription = localStorage.getItem('transcription');
    const savedRawTranscription = localStorage.getItem('rawTranscription');

    if (savedTranscription !== null) {
        document.getElementById('transcriptionResult').innerText = savedTranscription; // 保存された議事録の読み込み
    }
    if (savedRawTranscription !== null) {
        document.getElementById('rawTranscriptionResult').innerText = savedRawTranscription; // 保存された文字起こしの読み込み
    }
}

// 初期化時に保存されたデータを読み込む
window.addEventListener('load', function() {
    loadSavedTranscription();
});