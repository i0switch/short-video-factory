# Short Video Factory

最優先ゴールは、固定デザインの ranking 動画を 1コマンドで mp4 出力できること。
MVP外（YouTube投稿、複数テンプレート、コメントキャラ、いらすとやスクレイピング）は後回し。

詳細仕様は SPEC.md を参照。特にセクション5（デザイン仕様）は実動画を正確に再現した数値なので厳守すること。

## 技術スタック

TypeScript strict / pnpm / Remotion / VOICEVOX / Pexels API / zod / commander

## 実装順序（厳守）

1. **固定 RenderPlan で MP4 を出す**（fixtures/ + fallback画像 + 無音）
2. **VOICEVOX 連携**（実音声 + 音声尺でシーン長決定 + build-plan.ts）
3. **Pexels 画像取得**（英語キーワード + fallback）
4. **LLM 台本生成 + CLI統合**（テーマ入力 → MP4出力）

各ステップは、前のステップが動作確認できてから次に進む。

## デザイン上の重要ルール

- テキストは **巨大**（タイトル110px, 順位120px, 見出し64px）
- 縁取りは **太い**（6px 黒 + paintOrder: stroke fill + drop shadow）
- サンバーストは **5deg 間隔**（10deg だと別物になる）
- body テキストは **画面に表示しない**（VOICEVOX 読み上げ専用）
- ランキングシーンのレイアウト: 順位(上) → 見出し青枠(中) → 画像(下)
- デザイン定数は `src/remotion/design-tokens.ts` に集約

## 重要な設計判断

- **2段スキーマ**: Script → RenderPlan → Remotion（Remotion は Script を直接見ない）
- **ジョブ隔離**: generated/jobs/{timestamp}/ に出力。成功時のみ latest/ に昇格
- **intro/outro は固定3秒・音声なし**
- **Pexels は英語検索**: imageKeywordsEn フィールドを使う

## やらないこと（MVP外）

- YouTube自動投稿
- いらすとやスクレイピング
- コメントキャラ / 赤枠ボックス
- templates/ / テンプレートレジストリ
- 複数フォーマット
- BGM / 高度なアニメーション
- Pexels キャッシュ / JSON repair
- 管理画面 / DB

## Ghost Auto Memory
- セッション開始時、または本格作業前に `C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost\AUTO_MEMORY.md` を確認し、その手順に従う
- 基本は最初に `powershell -ExecutionPolicy Bypass -File "C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost-cli.ps1" memory recall` を実行する
- 続き物や過去知見が必要なときは `powershell -ExecutionPolicy Bypass -File "C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost-cli.ps1" memory search "query"` を使う
- 完了前に、再利用価値が高い内容だけを短く `powershell -ExecutionPolicy Bypass -File "C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost-cli.ps1" memory add "content" fact "source"` する
- 定期同期は `powershell -ExecutionPolicy Bypass -File "C:\Users\i0swi\OneDrive\デスクトップ\ナレッジ\ghost-sync.ps1"` で回せる
- 毎回ユーザーへ記憶操作を報告しなくていい
- APIキー、パスワード、秘密情報は保存しない