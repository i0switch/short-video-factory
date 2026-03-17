# Claude Code キックオフプロンプト

以下をClaude Codeのプロジェクトディレクトリで最初に実行してください。

---

## セットアップ

```bash
cd short-video-factory
```

## 最初の指示（これをClaude Codeにそのまま渡す）

```
CLAUDE.md と SPEC.md を読んで、Phase 1 を実装してください。

Phase 1 のゴールは:
「fixtures/sample-render-plan.json を入力にして、Remotion で MP4 を書き出せること」

以下の順番で進めてください:

1. pnpm + TypeScript + Remotion のプロジェクト初期化
2. src/schema/script.ts と src/schema/render-plan.ts の zod スキーマ定義
3. src/remotion/design-tokens.ts の作成（SPEC.md セクション5-7のデザイン定数）
4. src/utils/ のユーティリティ（config, logger, errors, paths, job）
5. Remotion コンポーネントの実装:
   - Sunburst.tsx（5deg間隔の放射状背景）
   - OutlineText.tsx（縁取りテキスト共通）
   - TextBox.tsx（青枠白背景ボックス）
   - TitleScene.tsx（超大文字テーマ + 下部画像）
   - RankingScene.tsx（順位 + 青枠見出し + 下部画像 + staggerアニメ）
   - EndingScene.tsx（超大文字CTA）
   - RankingVideo.tsx（全シーンを統合するcomposition）
   - Root.tsx
6. fixtures/sample-render-plan.json を読み込んでレンダリングする仕組み
7. pnpm preview でブラウザプレビューが動くことを確認
8. pnpm render で MP4 が出力されることを確認

重要:
- デザインは SPEC.md セクション5 の数値を厳守（テキスト110px/120px/64px、縁取り6px、サンバースト5deg）
- assets/fallback/ にプレースホルダー画像が3枚あるので、それを使ってください
- 音声は Phase 2 なので今は無音でOK
- まず pnpm preview でブラウザ表示を確認してから render に進む
```

## Phase 1 完了後の次の指示

```
Phase 2 を実装してください。SPEC.md セクション7（VOICEVOX連携）と セクション4-B（RenderPlan）を参照。

ゴールは:
「fixtures/sample-script.json + fallback画像 + VOICEVOXの実音声 → MP4 が出ること」

1. src/services/voicevox/index.ts（起動チェック + audio_query + synthesis + 音量補正）
2. WAV duration 解析
3. src/services/renderer/build-plan.ts（Script + audio結果 → RenderPlan 組立）
4. 音声尺に基づく durationInFrames の自動計算
5. エンドツーエンドテスト
```

## Phase 3, 4 も同様に一つずつ進める
