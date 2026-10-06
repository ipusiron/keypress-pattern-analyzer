'use strict';
(function (root) {
  const messages = {
  "ja": {
    "languageName": "English",
    "subtitle": "キーの押下・解放のタイミングを記録し、間隔とばらつきを学ぶツールです。本人確認はできません。",
    "note": "物理キーボード・IMEを使わない半角英数字入力を推奨します。IMEやソフトウェアキーボードはイベントが欠ける場合があります。秘密情報は入力しないでください。",
    "mode": "入力モード",
    "fixed": "定型文（半角推奨）",
    "custom": "指定文",
    "free": "自由入力",
    "ime": "IME変換中のキーイベントを除外する",
    "phrase": "目標文（定型文／指定文）",
    "start": "開始",
    "stop": "停止",
    "clear": "今回の記録を消去",
    "save": "プロファイルを保存",
    "export": "JSON出力",
    "import": "JSON読込",
    "compare": "比較",
    "delete": "保存プロファイルを全削除",
    "input": "入力欄",
    "captureNote": "開始後に入力してください。入力欄から離れると停止し、未解放キーを欠測として扱います。",
    "privacy": "保存すると名前・日時・入力本文・キー列・相対時刻・設定がこのブラウザーに残ります。JSONにも含まれます。画面の消去では保存データを削除しません。",
    "help": "説明",
    "close": "閉じる",
    "theme": "配色を切り替える",
    "reading": "読み方と限界",
    "noData": "データなし",
    "frequency": "使用頻度",
    "count": "回",
    "recording": "記録中です。秘密情報は入力しないでください。",
    "blur": "入力欄から離れたため停止しました。未解放キーは欠測です。",
    "windowBlur": "ウィンドウから離れたため停止しました。",
    "hidden": "ページが非表示になったため停止しました。",
    "textLimit": "入力文字数の上限で停止しました。",
    "timeLimit": "時間上限で停止しました。",
    "eventLimit": "記録の上限で停止しました。",
    "stopped": "記録を停止しました。",
    "profileLimit": "保存上限は50件です。保存プロファイルを削除してください。",
    "namePrompt": "プロファイル名（50文字以内）",
    "saved": "プロファイルを保存しました。",
    "saveFailed": "永続保存に失敗しました。この画面内には残っています。JSONを出力してください。",
    "invalidSave": "保存できません。名前・記録データを確認してください。",
    "loadFailed": "保存済みデータを読み込めません。元の保存内容は変更していません。",
    "deleteConfirm": "保存済みプロファイルをすべて削除しますか？",
    "deleted": "保存済みプロファイルを削除しました。ダウンロード済みJSONは削除されません。",
    "deleteFailed": "削除に失敗しました。ブラウザーのサイトデータ設定から削除してください。",
    "sizeLimit": "JSONは5,000,000バイト以下にしてください。",
    "imported": "検証済みプロファイルを読み込み、保存しました。",
    "importUnsaved": "読込は完了しましたが永続保存に失敗しました。JSONを出力してください。",
    "invalidImport": "読込を拒否しました。JSONの形式・値・件数を確認してください。既存データは変更していません。",
    "cosineNote": "コサイン類似度（本人一致率ではありません）。全時間が2倍でも1になります。機器・入力方式などの条件は利用者が確認してください。",
    "incomparable": "比較不可（欠測・条件不一致・条件不明・ゼロベクトル）",
    "beginPlaceholder": "開始を押してから入力してください",
    "typePlaceholder": "ここに入力してください",
    "interpretation": "UDは次のキーの押下−前のキーの解放です。負の値は押下の重なりを示します。\n標準偏差はこの記録内のばらつきで、本人固有性や能力を表しません。「—」は試料なし、0 msとは異なります。\nWPMは最終入力" +
      "のUnicodeコードポイント数÷5÷記録時間（分）です。最初の押下から最後の記録イベントまでを使います。訂正・貼り付け・IMEは値に影響します。\n本人確認・なりすまし耐性・押す力・疲労は判定できませ" +
      "ん。機器・ブラウザー・入力方式・練習の影響を受けます。物理キーの時間精度は保証しません。",
    "headings": [
      "モードと設定",
      "記録",
      "概要",
      "可視化",
      "2キー組（Digraph）",
      "実測値の解説",
      "プロファイル"
    ],
    "stats": [
      "押下数",
      "記録時間",
      "平均Dwell / DD"
    ],
    "cards": [
      "記録の概要",
      "タイミング特性",
      "試料数と欠測"
    ],
    "labels": [
      "WPM（5文字換算）",
      "解放確認数 / 押下数",
      "DDの標準偏差",
      "平均Dwell",
      "平均UD（Flight）",
      "UDの標準偏差",
      "DD / UDの試料数",
      "解放未確認の押下数",
      "記録区間の中断数"
    ],
    "viz": [
      "タイムライン",
      "リズム（DD）",
      "キー使用頻度"
    ],
    "columns": [
      "キー組（上位10組）",
      "平均DD",
      "平均UD",
      "試料数 DD / UD"
    ],
    "helps": [
      "定型文・指定文・自由入力から選びます。計測中は設定を変更できません。",
      "定型文は固定の英文、指定文は自分で用意した目標文、自由入力は目標文なしです。",
      "変換中のキーイベントを除外しても、IMEで正確に計測できるとは限りません。変換境界をまたぐ間隔は計算しません。",
      "比較には同じ目標文と同じ入力本文を使ってください。",
      "開始すると入力欄にフォーカスします。入力欄から離れると停止します。",
      "時間は最初の押下から最後の記録イベントまでです。開始ボタン後の待ち時間を含めません。",
      "グラフは記録の概観です。数値と欠測を合わせて読み、本人判定には使わないでください。",
      "対応する押下と解放を表示します。解放未確認のキーは描画しません。横にスクロールできます。",
      "同一区間の隣接キーのDDを表示します。色は能力評価ではありません。横にスクロールできます。",
      "キー値別の回数です。配列は模式図で実機とは限りません。追加キーは先頭14種まで、下の一覧は全種です。",
      "押下順の隣接キー組です。DDとUDの試料数は異なる場合があります。UDの負値は重なりです。",
      "試料数、欠測、平均、母標準偏差を表示します。認証性能や押す力を推定しません。",
      "入力本文・キー列も保存します。最大50件、JSONは5,000,000バイトまで。全削除は保存プロファイルのみが対象です。"
    ]
  },
  "en": {
    "languageName": "日本語",
    "subtitle": "Record key press/release timings and explore intervals and variation. This tool cannot verify identity.",
    "note": "A physical keyboard with direct ASCII input is recommended. IMEs and on-screen keyboards may omit events. Do not enter secrets.",
    "mode": "Input mode",
    "fixed": "Fixed phrase (ASCII recommended)",
    "custom": "Custom phrase",
    "free": "Free text",
    "ime": "Exclude key events during IME composition",
    "phrase": "Target phrase (fixed/custom)",
    "start": "Start",
    "stop": "Stop",
    "clear": "Clear this recording",
    "save": "Save profile",
    "export": "Export JSON",
    "import": "Import JSON",
    "compare": "Compare",
    "delete": "Delete all saved profiles",
    "input": "Input area",
    "captureNote": "Type after starting. Leaving the input area stops capture; unreleased keys are marked as missing.",
    "privacy": "Saving keeps the name, date, typed text, key sequence, relative timings and settings in this browser" +
      " and in exported JSON. Clearing a recording does not delete saved profiles.",
    "help": "Help",
    "close": "Close",
    "theme": "Toggle theme",
    "reading": "Interpretation and limits",
    "noData": "No data",
    "frequency": "Frequency",
    "count": " presses",
    "recording": "Recording. Do not enter secrets.",
    "blur": "Stopped after leaving the input area. Unreleased keys are missing observations.",
    "windowBlur": "Stopped after the window lost focus.",
    "hidden": "Stopped because the page became hidden.",
    "textLimit": "Stopped at the input length limit.",
    "timeLimit": "Stopped at the time limit.",
    "eventLimit": "Stopped at the recording limit.",
    "stopped": "Recording stopped.",
    "profileLimit": "The limit is 50 profiles. Delete saved profiles to make room.",
    "namePrompt": "Profile name (up to 50 characters)",
    "saved": "Profile saved.",
    "saveFailed": "Persistent storage failed. The profile remains in this page. Export JSON to keep it.",
    "invalidSave": "Cannot save. Check the name and recording data.",
    "loadFailed": "Cannot load saved data. Existing stored content has not been changed.",
    "deleteConfirm": "Delete all saved profiles?",
    "deleted": "Saved profiles deleted. Downloaded JSON files are not deleted.",
    "deleteFailed": "Deletion failed. Delete the data through your browser site-data settings.",
    "sizeLimit": "JSON must be at most 5,000,000 bytes.",
    "imported": "Validated profiles imported and saved.",
    "importUnsaved": "Import completed but persistent storage failed. Export JSON to keep the data.",
    "invalidImport": "Import rejected. Check the JSON structure, values and profile count. Existing data is unchanged.",
    "cosineNote": "Cosine similarity is not an identity probability. Doubling every timing still gives 1. Check equipme" +
      "nt and input-method conditions yourself.",
    "incomparable": "Not comparable (missing data, unequal/unknown conditions, or a zero vector)",
    "beginPlaceholder": "Click Start before typing",
    "typePlaceholder": "Type here…",
    "interpretation": "UD is the next key press minus the preceding key release. Negative values indicate overlapping press" +
      "es.\nStandard deviation describes variation in this recording, not uniqueness or ability. “—” means n" +
      "o samples, not 0 ms.\nWPM is the final Unicode code-point count / 5 / recording minutes, from the fir" +
      "st press to the last recorded event. Editing, paste and IME input affect it.\nThis tool cannot assess" +
      " identity, impersonation resistance, force or fatigue. Equipment, browsers, input methods and practi" +
      "ce affect the values. Physical-key timing accuracy is not guaranteed.",
    "headings": [
      "Mode & settings",
      "Capture",
      "Summary",
      "Visualizations",
      "Key pairs (digraphs)",
      "Measurement details",
      "Profiles"
    ],
    "stats": [
      "Key presses",
      "Recording duration",
      "Mean Dwell / DD"
    ],
    "cards": [
      "Recording overview",
      "Timing statistics",
      "Samples and missing data"
    ],
    "labels": [
      "WPM (5-character words)",
      "Matched releases / presses",
      "DD standard deviation",
      "Mean Dwell",
      "Mean UD (Flight)",
      "UD standard deviation",
      "DD / UD samples",
      "Unreleased presses",
      "Recording interruptions"
    ],
    "viz": [
      "Timeline",
      "Rhythm (DD)",
      "Key frequency"
    ],
    "columns": [
      "Key pair (top 10)",
      "Mean DD",
      "Mean UD",
      "Samples DD / UD"
    ],
    "helps": [
      "Choose fixed, custom or free text. Settings are locked during capture.",
      "Fixed uses a preset English phrase; custom uses your target phrase; free text has no target.",
      "Excluding composition events does not guarantee accurate IME measurements. Intervals crossing composition boundaries are excluded.",
      "Use the same target phrase and the same typed text when comparing recordings.",
      "Start focuses the input area. Leaving the input area stops recording.",
      "Duration runs from the first press to the last recorded event, excluding the wait after clicking Start.",
      "Charts summarize recordings. Read the numbers and missing-data counts too; do not use them to identify people.",
      "Matched presses and releases are shown. Unreleased keys are omitted. Scroll horizontally if needed.",
      "DD intervals between adjacent presses in the same segment are shown. Colors do not rate ability. Scroll horizontally if needed.",
      "Counts are grouped by key value. The schematic layout may differ from your keyboard. Up to 14 extra keys are drawn; the text list includes all.",
      "Pairs follow press order. DD and UD sample counts may differ. Negative UD indicates overlapping presses.",
      "Counts, missing observations, means and population standard deviations are shown. Authentication performance and force are not estimated.",
      "Typed text and key sequences are saved too. Limits: 50 profiles and 5,000,000 bytes per JSON. Delete all removes saved profiles only."
    ]
  }
};
  if (typeof module !== 'undefined' && module.exports) module.exports = messages;
  else root.KeystrokeMessages = messages;
})(globalThis);
