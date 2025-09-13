# Algorithm Documentation - KeyPress Pattern Analyzer

## 📊 アルゴリズム・処理詳細ドキュメント

本ドキュメントでは、KeyPress Pattern Analyzerで使用されている複雑な解析アルゴリズム、評価基準、および実装の詳細について説明します。

---

## 🕒 基本タイミング指標の計算

### 計測される4つの基本指標

#### 1. **Dwell Time（キー押下持続時間）**
```javascript
dwellTime = keyUpTime - keyDownTime
```
- **意味**: キーを押してから離すまでの時間
- **典型値**: 80-250ms
- **個人差**: 軽快なタッチ vs 確実な押下

#### 2. **Flight Time（キー間移行時間）**
```javascript
flightTime = nextKeyDownTime - currentKeyUpTime
```
- **意味**: キーを離してから次のキーを押すまでの時間
- **典型値**: 100-400ms
- **個人差**: 指の移動速度、思考時間

#### 3. **DD Time（Down-to-Down間隔）**
```javascript
ddTime = nextKeyDownTime - currentKeyDownTime
```
- **意味**: 連続するキー押下間の総時間
- **用途**: タイピングリズムの分析

#### 4. **UD Time（Up-to-Down間隔）**
```javascript
udTime = nextKeyDownTime - currentKeyUpTime
```
- **意味**: キー解放から次のキー押下までの時間
- **用途**: Digraph分析での個人特性抽出

---

## 📈 統計的解析手法

### 平均値・標準偏差の計算
```javascript
function average(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr) {
  const avg = average(arr);
  const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
  return Math.sqrt(variance);
}
```

### 変動係数（CV: Coefficient of Variation）
```javascript
cv = standardDeviation / average
```
- **意味**: データの相対的なばらつき
- **用途**: タイピングの安定性評価
- **評価基準**: 低いほど安定

### WPM（Words per Minute）計算
```javascript
wpm = (totalCharacters / 5) / (durationMs / 60000)
```
- **標準**: 1単語 = 5文字として計算
- **時間単位**: ミリ秒から分に変換

---

## 🔤 n-gram（Digraph）解析

### Digraphパターンの抽出
```javascript
// 2文字連続パターンの記録
for (let i = 0; i < events.length - 1; i++) {
  const digraph = events[i].key + events[i+1].key;
  if (!digraphs.has(digraph)) {
    digraphs.set(digraph, { DD: [], UD: [], samples: 0 });
  }
  digraphs.get(digraph).DD.push(ddTime);
  digraphs.get(digraph).UD.push(udTime);
  digraphs.get(digraph).samples++;
}
```

### 個人特性の分類
- **高速パターン**: 平均より30%以上速い組み合わせ
- **低速パターン**: 平均より30%以上遅い組み合わせ
- **安定パターン**: 標準偏差が平均の50%以下の組み合わせ

---

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
const adaptiveFontSize = Math.max(8, config.fontSize - density * 3 + importance * 2);
```

### Rhythm可視化
#### 平滑化処理
```javascript
// 移動平均によるリズム平滑化
const smoothedIntervals = intervals.map((interval, i) => {
  const start = Math.max(0, i - 2);
  const end = Math.min(intervals.length, i + 3);
  const window = intervals.slice(start, end);
  return average(window);
});
```

### Keyboard Heatmap
#### 色強度計算
```javascript
const intensity = frequency / maxFrequency;

// ライトモード: 青→赤グラデーション
const red = Math.floor(30 + intensity * 200);
const green = Math.floor(100 - intensity * 80);
const blue = Math.floor(255 - intensity * 100);

// ダークモード: 青→黄/赤グラデーション
const red = Math.floor(intensity * 255);
const green = Math.floor(intensity * 180);
const blue = Math.floor(255 - intensity * 255);
```

---

## 🔒 セキュリティ評価アルゴリズム

### 8項目評価システム

#### 1. **タイミング一貫性スコア**
```javascript
const stabilityScore = Math.max(0, 100 - (coefficientOfVariation * 100));
```
- **基準**: 変動係数が低いほど高スコア
- **理想値**: 70-85%（高すぎても低すぎても問題）

#### 2. **リズム安定性評価**
```javascript
const rhythmConsistency = 100 - (ddTimeStdDev / ddTimeAverage * 100);
```
- **意味**: DD時間の一貫性
- **個人差**: 個人特有のリズムパターン

#### 3. **Digraphパターン複雑度**
```javascript
const complexity = uniqueDigraphs / totalPossibleDigraphs * 100;
```
- **計算**: 使用した文字組み合わせの多様性
- **意味**: 高いほど模倣困難

#### 4. **キー使用分布の均等性**
```javascript
const entropy = -frequencies.reduce((sum, freq) => {
  const p = freq / totalKeys;
  return sum + (p > 0 ? p * Math.log2(p) : 0);
}, 0);
```
- **手法**: 情報エントロピーによる分布評価
- **高値**: 多様なキー使用パターン

#### 5. **入力速度の安定性**
```javascript
const speedVariation = stdDeviation(intervalsBetweenKeystrokes) / averageInterval;
```
- **評価**: 速度変動の少なさ
- **意味**: 一定速度での入力能力

#### 6. **エラー回復パターン**
```javascript
// Backspace使用頻度と修正パターン
const errorRecoveryPattern = backspaceEvents.length / totalEvents;
```
- **分析**: 修正行動の個人特性
- **特徴**: エラー対処の習慣

#### 7. **特徴的時間間隔の存在**
```javascript
// 特定時間間隔の頻出度
const uniqueIntervals = intervals.filter(interval => 
  Math.abs(interval - averageInterval) > standardDeviation * 1.5
);
```
- **検出**: 個人特有の時間間隔
- **意味**: 認証に有用な特徴

#### 8. **全体的な識別可能性**
```javascript
const identifiability = (
  stabilityScore * 0.2 +
  complexityScore * 0.25 +
  entropyScore * 0.2 +
  uniquenessScore * 0.35
);
```
- **総合評価**: 重み付き平均による総合スコア
- **用途**: バイオメトリック認証の実用性評価

### 偽装耐性の評価

#### 模倣困難度の判定
```javascript
if (stabilityScore >= 70 && complexityScore >= 60 && entropyScore >= 65) {
  resistanceLevel = "高";
  security = "意図的な模倣は非常に困難";
} else if (stabilityScore >= 50 && complexityScore >= 40) {
  resistanceLevel = "中";
  security = "模倣には相当な練習が必要";
} else {
  resistanceLevel = "低";
  security = "比較的模倣しやすいパターン";
}
```

### 推奨セキュリティレベル

#### 用途別推奨基準
```javascript
if (identifiabilityScore >= 75) {
  recommendation = "高セキュリティ用途に適用可能";
} else if (identifiabilityScore >= 60) {
  recommendation = "中程度のセキュリティ用途で有効";
} else if (identifiabilityScore >= 40) {
  recommendation = "低セキュリティ用途での補助認証";
} else {
  recommendation = "追加の識別要素と組み合わせて使用";
}
```

---

## 📊 ベンチマーク基準値

### タイピング速度基準
```javascript
const wpmBenchmarks = {
  beginner: 20,    // 初心者レベル
  average: 40,     // 平均レベル
  good: 60,        // 良好レベル
  expert: 80       // 上級者レベル
};
```

### タイミング基準値
```javascript
const timingBenchmarks = {
  dwellTime: {
    fast: 100,     // 軽快なタッチ
    average: 150,  // 平均的
    slow: 200      // 確実な押下
  },
  flightTime: {
    fast: 150,     // 素早い移動
    average: 250,  // 平均的
    slow: 350      // 慎重な選択
  }
};
```

### 安定性基準
```javascript
const stabilityBenchmarks = {
  veryStable: 80,  // 非常に安定
  stable: 65,      // 安定
  unstable: 50     // 不安定
};
```

---

## 🔄 データ処理フロー

### 1. **リアルタイム捕捉**
```
KeyDown Event → performance.now() → Event Storage
KeyUp Event → performance.now() → Dwell Time Calculation
```

### 2. **前処理・検証**
```
Input Sanitization → IME Filtering → Key Code Validation → Event Buffering
```

### 3. **メトリクス計算**
```
Raw Events → Basic Metrics → Statistical Analysis → Pattern Recognition
```

### 4. **可視化処理**
```
Processed Data → Canvas Rendering → Interactive Elements → Real-time Updates
```

### 5. **評価・分析**
```
Metrics → Security Evaluation → Benchmark Comparison → Summary Generation
```

---

## 🛡️ セキュリティ考慮事項

### データ保護
- **ローカル処理**: すべての計算はクライアント側で実行
- **一時データ**: ページリロード時に自動消去
- **サニタイゼーション**: 入力値の検証と無害化

### プライバシー保護
- **外部送信なし**: ネットワーク通信は一切行わない
- **匿名化**: 個人識別情報は記録しない
- **セッション分離**: ブラウザタブ間でのデータ共有なし

### 偽装対策
- **複数指標**: 単一指標に依存しない多面的評価
- **動的閾値**: 個人適応型の判定基準
- **時系列分析**: 瞬間的な値ではなくパターン重視

---

## 🔐 行動バイオメトリクス認証の理解

### キーストローク・ダイナミクス認証とは

本ツールで分析される「本人認証」は、**行動バイオメトリクス**による認証技術です。

#### 基本概念
```
従来認証: パスワード = 「何を知っているか」(What you know)
行動認証: タイピングパターン = 「どのように入力するか」(How you type)
```

#### 認証プロセス
1. **学習フェーズ**: 本人のタイピング特性を収集・学習
   ```javascript
   profile = {
     dwellTime: { mean: 150, stdDev: 25 },
     flightTime: { mean: 200, stdDev: 40 },
     digraphs: { "th": { DD: 180, UD: 160 }, ... }
   }
   ```

2. **認証フェーズ**: リアルタイム入力との照合
   ```javascript
   similarity = comparePatterns(currentInput, learnedProfile);
   if (similarity > threshold) { authenticate(); }
   ```

3. **継続認証**: セッション中の継続的な本人確認

### 安定性スコアと認証精度の関係

#### スコア別の認証適用性
```javascript
if (stabilityScore >= 70) {
  // 高精度認証が可能
  application = "単体での本人認証";
  falseRejectRate = "< 5%";
} else if (stabilityScore >= 50) {
  // 補助認証として有効
  application = "パスワード＋行動認証";
  falseRejectRate = "10-20%";
} else {
  // 認証には不適切
  application = "パターン分析のみ";
  falseRejectRate = "> 30%";
}
```

#### 低安定性（15%）の具体的問題
- **False Rejection（本人拒否）**: 本人入力でも30%以上の確率で拒否
- **学習困難**: 基準パターンの確立が困難
- **閾値設定不可**: 適切な判定基準を決められない

### 実用例：パスワード入力時の同時認証
```javascript
// 2要素認証の例
const authResult = {
  password: "password123", // ✓ 正しい文字列
  keystrokePattern: {
    dwellAvg: 145,      // 学習済み: 150±25ms
    "pa": { DD: 195 },  // 学習済み: 200±30ms
    similarity: 0.85    // 閾値: 0.7以上
  }
};

if (authResult.password.valid && authResult.keystrokePattern.similarity > 0.7) {
  return "認証成功";
}
```

### 改善・最適化の指針

#### タイピング安定化の方法
1. **環境統一**: 同じキーボード・姿勢・時間帯
2. **反復練習**: 同一フレーズでの継続練習
3. **意識的入力**: リズムを意識した入力
4. **十分なサンプル**: 最低50回以上の入力記録

#### システム側の対応
```javascript
// 適応的閾値の例
if (stabilityScore < 50) {
  threshold = 0.5;  // 緩い判定
  requireAdditionalAuth = true;
} else {
  threshold = 0.8;  // 厳格な判定
  standAloneAuth = true;
}
```

---

## 🔬 研究・教育での活用

### 学術研究での応用
- **行動バイオメトリクス**: 行動特性による個人認証研究
- **人間工学**: タイピング効率と疲労の関係分析
- **サイバーセキュリティ**: 継続認証システムの研究

### 教育目的での利用
- **セキュリティ教育**: 生体認証の原理理解
- **統計学習**: 実データでの統計分析実習
- **プログラミング教育**: リアルタイム処理の実装学習

---

*このドキュメントは技術者・研究者向けの詳細仕様書です。一般利用者向けの情報は[README.md](./README.md)をご参照ください。*