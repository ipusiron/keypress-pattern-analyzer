# Technical Documentation - KeyPress Pattern Analyzer

## 📊 キーストローク解析の技術的詳細

### 計測メトリクス

#### 基本タイミング指標
- **Dwell Time**: キー押下時間 (keydown → keyup)
- **Flight Time**: キー間移行時間 (keyup → 次のkeydown)
- **DD Time**: Down-to-Down間隔 (keydown → 次のkeydown)
- **UD Time**: Up-to-Down間隔 (keyup → 次のkeydown)

#### 統計的指標
- **平均値・標準偏差**: 各タイミング指標の分布
- **変動係数**: タイピングの安定性評価 (CV = σ/μ)
- **WPM**: Words per Minute (文字数÷5÷分)

### n-gram解析

#### Digraph分析
2文字連続パターンの時間的特徴を抽出：
```
例: "th" → DD時間、UD時間を記録
複数回出現時は平均値を算出
```

#### 個人識別への応用
- 特定の文字組み合わせに現れる個人特有のリズム
- 物理的なキー配置と指の動きの関係
- 学習効果による時間短縮パターン

## 🔬 生体認証としのキーストロークダイナミクス

### 認証原理
1. **登録フェーズ**: 複数回の同一テキスト入力でベースライン作成
2. **認証フェーズ**: リアルタイム入力パターンとベースライン比較
3. **判定**: 類似度閾値による本人/他人判別

### 類似度計算手法

#### コサイン類似度
```javascript
similarity = (A · B) / (|A| × |B|)
特徴ベクトル: [avgDwell, avgFlight, avgDD, ...]
```

#### Dynamic Time Warping (DTW)
時系列パターンの位相差を考慮した距離計算（実装検討中）

#### 統計的距離
- ユークリッド距離
- マハラノビス距離（共分散考慮）

## 🎯 音響解析との組み合わせ技術

### サイドチャネル攻撃の概要
キーボード操作音から入力内容・パターンを推定する手法

#### 音響特徴量
- **タイミング情報**: キー押下音の間隔
- **周波数スペクトル**: キーごとの音響特性
- **振幅変化**: 押下強度の推定

#### 本ツールとの連携
1. **視覚パターン作成**: 正確なタイミングデータ
2. **音響データ照合**: 録音から推定したタイミングと比較
3. **精度向上**: 複数モダリティでの認証精度向上

### 防御的応用
- **攻撃検知**: 異常なタイミングパターンの検出
- **ノイズ注入**: 意図的なタイミング変動による対策
- **環境音考慮**: 背景ノイズ下での解析精度評価

## 🛡️ セキュリティ応用

### フォレンジック調査
- **証拠保全**: タイピングパターンの客観的記録
- **容疑者照合**: 既知パターンとの類似度分析
- **時系列分析**: 作成時間帯・作業パターンの推定

### 侵入検知システム
- **継続認証**: 作業中の本人性継続確認
- **異常検知**: 通常と異なるタイピングパターン検出
- **セッション監視**: 長時間作業での疲労・ストレス検出

## 🔧 実装技術詳細

### JavaScript API活用
```javascript
// 高精度タイミング
performance.now() // マイクロ秒精度
event.timeStamp   // イベント発生時刻

// IME処理
event.isComposing // 日本語入力状態検知
event.code vs event.key // 物理キー vs 論理文字
```

### Canvas可視化
- **Timeline**: SVG風レンダリングでスケーラブル表示
- **Rhythm**: リアルタイム波形描画
- **Heatmap**: 頻度マッピングとカラーグラデーション

### データ永続化
```javascript
localStorage: プロファイル保存
JSON Export/Import: 研究データ交換
```

## 📈 評価指標

### 認証性能
- **FAR** (False Accept Rate): 他人受入率
- **FRR** (False Reject Rate): 本人拒否率
- **EER** (Equal Error Rate): FAR=FRRとなる閾値

### システム性能
- **計測精度**: ミリ秒レベルの時間分解能
- **処理速度**: リアルタイム解析対応
- **メモリ効率**: ブラウザ環境での軽量動作

## 🔮 発展的応用

### 機械学習統合
- **特徴抽出**: 深層学習による高次元特徴
- **パターン認識**: RNN/LSTMによる時系列学習
- **異常検知**: オートエンコーダーによる外れ値検出

### マルチモーダル認証
- **視線追跡**: 画面注視パターンとの組み合わせ
- **マウス操作**: クリック・移動パターンとの統合
- **姿勢検知**: WebCamを活用した身体的特徴

### プライバシー保護技術
- **差分プライバシー**: 統計的プライバシー保護
- **連合学習**: 生データを共有しない学習手法
- **同態暗号**: 暗号化状態での計算処理

## 📚 参考文献・標準

### 学術論文
- Keystroke Dynamics for User Authentication (Bailey et al.)
- Continuous Authentication using Biometric Keystroke Dynamics
- Acoustic Side-Channel Attacks on Keyboards (Zhuang et al.)

### 標準規格
- ISO/IEC 24745: Biometric Information Protection
- NIST SP 800-76: Biometric Specifications for PIV
- IEEE 2857: Privacy Engineering Framework

### 技術仕様
- W3C KeyboardEvent Interface
- WebAudio API for Acoustic Analysis
- Canvas 2D Context Specification