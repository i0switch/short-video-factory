# Claude Code 起動プロンプト v3

## プロジェクトにコピーするファイル一覧

```bash
# 指示書（これが唯一の正）
cp DEFINITIVE_v3.md short-video-factory/

# ChatGPT分析書（参照用）
cp 動画差分レポート.md short-video-factory/
cp Remotion設計書.md short-video-factory/
cp 動画差分レポートv2.md short-video-factory/
cp Remotion設計書v2.md short-video-factory/

# サンプルデータ
cp sample-video.json short-video-factory/data/
```

## 最初に渡すプロンプト

```
プロジェクトルートにある DEFINITIVE_v3.md を読んでください。
これが唯一の実装指示書です。過去の指示書は全て破棄。

参照ドキュメント（必要時に参照）:
- Remotion設計書v2.md — コンポーネント設計・スキーマ詳細
- 動画差分レポートv2.md — 現outputと理想の差分分析
- Remotion設計書.md / 動画差分レポート.md — 補足

⚠️ 前回までの実装からの重大な変更点:
1. 背景は静止（回転させない）
2. 各ランキングシーンは2フェーズ（Phase1: 見出し+画像A → Phase2: ボックス+画像B）
3. 見出しはPhase2開始前に消える（OUT animation あり。F75-84で退場）
4. 画像スロットは1シーンにつき2つ（assetA, assetB）
5. シーン遷移は1f黒フラッシュ + 10f明転（暗転/クロスフェード禁止）
6. ボックス内テキストは左揃え
7. 下段ボックスは上段より右に26pxインデント

では DEFINITIVE_v3.md の Step 1 から開始してください。
Step 1 完了後に pnpm preview でエラーがないことを確認し、結果を報告してください。
Step 1 の確認が取れるまで Step 2 に進まないこと。
```

## 並列化が可能なStep

Step 4, 5, 6 は独立コンポーネントなので並列サブエージェント可能:

```
Step 4, 5, 6 を並列サブエージェントで同時実装して。

サブエージェント1: AssetImage.tsx（src/components/media/）
  → DEFINITIVE_v3.md の Step 4 に従う
  → 画像A/Bの切替、fallback、正方形枠

サブエージェント2: RankHeader.tsx + MainTitleText.tsx（src/components/text/）
  → DEFINITIVE_v3.md の Step 5 に従う
  → 見出しのIN/OUTアニメーション

サブエージェント3: CaptionBox.tsx（src/components/text/）
  → DEFINITIVE_v3.md の Step 6 に従う
  → 上段青枠/下段赤枠、左揃え

3つ完了後、メインスレッドで RankingScene に統合して pnpm render で確認。
```

## Step完了ごとの確認プロンプト

```
OK。pnpm render で MP4 を出力して、ブラウザで開いて以下を確認して:
1. [そのStepで追加した要素] が正しく表示されているか
2. 前のStepで動いていた部分が壊れていないか
3. DEFINITIVE_v3.md の「禁止事項チェックリスト」に違反していないか
確認結果を報告して。問題なければ次のStepに進んで。
```

## 全Step完了後の最終確認

```
全編を pnpm render して MP4 を出力して。

以下のキーフレームをブラウザで確認:
- F45 (1.5s): Intro表示
- F141 (4.7s): Rank10のPhase1
- F300 (10.0s): Rank9のPhase2
- F936 (31.2s): Rank5のPhase1
- F1032 (34.4s): Rank5のPhase2
- F1740 (58.0s): Outro CTA

各フレームで:
- RankHeaderが上部中央にあるか
- 見出し/ボックスが正しいフェーズで表示/非表示か
- 画像A/Bが正しく切り替わっているか
- 1f黒フラッシュがシーン頭にあるか
- ボックスが左揃えか
結果を報告して。
```
