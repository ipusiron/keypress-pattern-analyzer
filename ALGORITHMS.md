# Algorithm Documentation - KeyPress Pattern Analyzer

## 📊 アルゴリズム・処理詳細ドキュメント

本ドキュメントでは、KeyPress Pattern Analyzerで使用されているタイミング計算、記述統計、および実装の詳細について説明します。

---

## 🕒 基本タイミング指標の計算

### 計測するタイミング（FlightとUDは同じ指標）

#### 1. Dwell Time（キー押下持続時間）
```javascript
dwellTime = keyUpTime - keyDownTime
```
- 意味: キーを押してから離すまでの時間

#### 2. Flight Time（キー間移行時間）
```javascript
flightTime = nextKeyDownTime - currentKeyUpTime
```
- 意味: キーを離してから次のキーを押すまでの時間

#### 3. DD Time（Down-to-Down間隔）
```javascript
ddTime = nextKeyDownTime - currentKeyDownTime
```
- 意味: 連続するキー押下間の総時間
- 用途: タイピングリズムの分析

#### 4. UD Time（Up-to-Down間隔）
```javascript
udTime = nextKeyDownTime - currentKeyUpTime
```
- 意味: キー解放から次のキー押下までの時間
- 用途: 押下順の隣接キー組の間隔観察

---

## 📈 統計的解析手法

### 平均値・標準偏差の計算
```javascript
function average(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

function standardDeviation(arr) {
  if (!arr.length) return null;
  const avg = average(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
  return Math.sqrt(variance);
}
```

試料なしはnullを返し、画面では「—」と表示します。
分散の分母は試料数nです。標準偏差から認証性能や能力を推定しません。

### WPM（Words per Minute）計算
```javascript
wpm = (totalCharacters / 5) / (durationMs / 60000)
```
- 標準: 1単語 = 5文字として計算
- 時間単位：ミリ秒から分に変換

文字数は最終入力のUnicodeコードポイント数です。
時間は最初の押下から最後の記録イベントまでで、0ならWPMはnullです。

---

### 2件の平均値の差分

learning.jsは同じ入力条件の記録AとBについて、平均Dwell、DD、UDごとにB−Aを計算します。
差はms単位で、値が大きいことを能力の高さや低さとは解釈しません。
通常の人工例（80、120、40ms）と時間2倍の人工例（160、240、80ms）の差は80、120、40msです。
コサイン類似度は1でも、この差はゼロではありません。

入力条件不明、IME、欠測、中断、貼り付けなどの除外条件があるときは、個々の値だけを表示します。
欠測をゼロで補わず、差分、類似度、比較図は表示しません。
人工サンプルは保存記録と分離し、同じコアで計算します。

## 🔤 n-gram（Digraph）解析

### Digraphパターンの抽出

押下を順番に並べ、各押下に同じキーコードの解放を対応させます。
隣接する押下A、Bについて、DD=B↓−A↓、UD=B↓−A↑を計算します。
UD=-40msのような負の間隔もそのまま集計します。
Aの解放がない場合、DDは集計できてもUDは集計できません。

同じキーの長押しリピートと対応する押下のない解放は計測対象から除きます。
中断イベントは押下状態を破棄し、前後の区間をまたぐ組を作りません。
キー名の組はJSONの2要素配列として内部識別し、単純な連結による衝突を防ぎます。
表はDD試料数の多い順で上位10組です。

## 🎯 可視化アルゴリズム

### Timeline可視化
#### 多段階レイヤーシステム
```javascript
const layers = [
  { y: y + barHeight/2 - textHeight/2, priority: 0, name: 'center' },
  { y: y - textHeight - 4, priority: 1, name: 'above' },
  { y: y + barHeight + 4, priority: 2, name: 'below' },
  { y: y - textHeight * 2 - 8, priority: 3, name: 'far-above' }
];
```

#### 適応的文字サイズ
```javascript
const density = Math.min(events.length / 50, 1);
const importance = Math.min(dwellTime / 200, 1);
const baseFontSize = Math.max(8, config.fontSize - density * 3 + importance * 2);
const adaptiveFontSize = Math.min(12, Math.max(8, baseFontSize));
```

### Rhythm可視化
同一区間の隣接押下のDD値を順番に描画します。
移動平均による平滑化は行いません。色は能力や安定性の採点ではありません。

### Keyboard Heatmap
#### 色強度計算
```javascript
const intensity = frequency / maxFrequency;

// ライトモード: 青→赤グラデーション
const red = Math.floor(30 + intensity * 200);
const green = Math.floor(100 - intensity * 80);
const blue = Math.floor(255 - intensity * 100);

// ダークモード: 青→黄/赤グラデーション
const darkRed = Math.floor(intensity * 255);
const darkGreen = Math.floor(intensity * 180);
const darkBlue = Math.floor(255 - intensity * 255);
```

---

## 🔄 データ処理フロー

1. 開始時に今回のイベントと結果を消去し、入力設定を記録する。
2. 入力欄の押下と解放をperformance.now()の相対時刻で記録する。
3. 停止時に押下と解放を対応させ、指標と欠測を計算する。
4. グラフ、試料数、平均、母標準偏差と限界の説明を表示する。
5. 保存時は入力本文とイベントを保存し、読込時は検証後に指標を再計算する。

## 🛡️ セキュリティ考慮事項

計測はブラウザー内ですが、保存データは匿名化も暗号化もされません。
保存プロファイルは再読み込み後も残り、明示的な削除が必要です。
JSONの上限、型、時刻の順序、有限値を検証してから一括採用します。
文字列をDOMへ表示するときはtextContentを使います。
入力本文、キー列をコンソールへ出力しません。

## 🔐 行動バイオメトリクス認証の理解

このツールは認証器ではなく、本人と他人を判定しません。
認証性能の研究では、学習用と評価用のデータ、本人と他人の試行を分けて評価する必要があります。
単一記録の平均や標準偏差から、誤り率や模倣耐性は求められません。[CMUの評価手順](https://www.cs.cmu.edu/~keystroke/)

比較で使うコサイン類似度は、平均Dwell、平均UD、平均DDからなるベクトルの角度の比較です。
すべての値を2倍にしても類似度は1です。本人一致率ではありません。
必要な指標がない場合やゼロベクトルでは値を出しません。
その他の比較条件は[README](README.md)を参照してください。

## 🔬 研究と教育での活用

- 統計学習：平均、母標準偏差、欠測による試料数の変化を確認
- プログラミング教育：キーイベント、対応づけ、JSON検証の実装を読む
- 計測の学習：機器や入力方式の違いを記録し、物理的な時間精度とブラウザーの時刻を区別

一般利用者向けの情報は[README.md](README.md)を参照してください。
