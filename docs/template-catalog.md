# Short Video Factory テンプレートカタログ

最終更新: 2026-03-29

---

## パイプライン一覧

| パイプライン | コマンド | 用途 |
|-------------|---------|------|
| **ランキング形式** | `pnpm render:v3` | 10→1カウントダウン動画 |
| **2ch風/実況風（Repro）** | `pnpm render:repro2 {videoId}` | 元動画再現・キャラ合成動画 |

---

## 1. ランキング形式パイプライン（render:v3）

### テンプレ

| ファイル | 説明 |
|---------|------|
| `templates/ranking-default.json` | ベーステンプレ（サンバースト背景+アニメーション定義） |
| `templates/scripts/ranking-black-company.json` | 台本サンプル（ブラック企業ランキング10→1） |
| `src/remotion/data/sample-video-config.json` | 動作確認用フルコンフィグ（347行） |
| `themes/default.json` | デフォルトテーマ |
| `themes/blue.json` | 青テーマ |
| `themes/dark.json` | ダークテーマ |

### コンポーネント

| ファイル | 役割 |
|---------|------|
| `src/remotion/RankingVideo.tsx` | メインオーケストレーター（Sequence制御） |
| `src/remotion/RankingScene.tsx` | ランキングシーン（Phase A/B/C） |
| `src/remotion/compositions/RankingVideoComposition.tsx` | Composition ラッパー |
| `src/render-v3.ts` | レンダラー（TTS+Remotion+BGM合成） |
| `src/schema/script.ts` | 台本スキーマ（rank降順バリデーション） |
| `src/schema/render-plan.ts` | レンダープランスキーマ |

### ビジュアルリファレンス

| ファイル | 説明 |
|---------|------|
| `reference/current_ranking.jpg` | 現在の実装 |
| `reference/ideal_ranking.jpg` | 目標デザイン |
| `reference/ideal_ranking2.jpg` | 目標デザイン2 |
| `reference/current_title.jpg` | タイトルシーン現状 |
| `reference/ideal_title.jpg` | タイトルシーン目標 |
| `reference/current_ending.jpg` | エンディング現状 |
| `reference/ideal_ending.jpg` | エンディング目標 |

### 台本構造
```json
{
  "videoTitle": "テーマ（20文字以内）",
  "intro": "タイトル読み上げ",
  "items": [
    { "rank": 10, "topic": "お題", "comment1": "共感系", "comment2": "ツッコミ系", "body": "ナレーション", "imageKeywords": ["日本語"], "imageKeywordsEn": ["english"] }
  ],
  "outro": "エンディング"
}
```

---

## 2. 2ch風/実況風パイプライン（render:repro2）

### 再現テンプレ（timeline.json）

| # | videoId | タイトル | ショット | 尺 | RECIPE | 状態 |
|---|---------|---------|---------|-----|--------|------|
| 1 | EzFYQHX5ICY | 笑える迷言集〜教師たちの反応w〜 | 28 | 41s | あり | 完成 |
| 2 | lLBcGh4DZ8A | 競技化彼氏 朝の支度グランプリ | 31 | 42s | あり | 完成(iter_65) |
| 3 | DbfqzSPaUwc | 笑える迷言集〜誕生日ケーキ〜 | 38 | 58s | なし | timeline有 |
| 4 | ETV-VtnQJwQ | 会計よろしく【2chスカッと総集編】 | 46 | 179s | なし | timeline有 |
| 5 | JMNJxpptaIc | 買い物中こんな場面〜 | 28 | 59s | なし | timeline有 |
| 6 | oaOq39FXJx8 | 笑える迷言集〜キョンシー百貫〜 | 35 | 59s | なし | timeline有 |

### 台本テンプレ（scripts/）

| ファイル | 説明 |
|---------|------|
| `templates/scripts/2ch-narrative.json` | 1話完結ストーリー（15-20シーン） |
| `templates/scripts/2ch-omnibus.json` | 複数エピソード詰め合わせ |
| `templates/scripts/2ch-ultrashort.json` | 一発ネタ12秒 |

### 参考動画台本（scripts/ref-*）

| ファイル | 元動画 |
|---------|--------|
| `ref-01-scatto.json` | スカット |
| `ref-02-kyougika.json` | 競技化（lLBcGh4DZ8Aの台本版） |
| `ref-03-suwarenai.json` | 座れない |
| `ref-04-tome.json` | トメ |
| `ref-05-mukifumuki.json` | 向き不向き |
| `ref-06-happybirthday.json` | 誕生日ケーキ |
| `ref-07-kaikei.json` | 会計 |
| `ref-08-kyoushi.json` | 教師 |
| `ref-09-toshokan.json` | 図書館 |
| `ref-10-kaimono.json` | 買い物 |

### コンポーネント

| ファイル | 役割 |
|---------|------|
| `src/remotion/compositions/ReproComposition.tsx` | メインコンポーネント（レイアウト・エフェクト・キャプション） |
| `src/render-repro-v2.ts` | レンダラー（TTS + fixed timing + BGM合成） |
| `src/utils/text-wrap.ts` | BudouX改行ユーティリティ |

### RECIPEファイル

| ファイル | 動画 |
|---------|------|
| `templates/repro_charcomp/RECIPE.md` | EzFYQHX5ICY（キャラ合成型の汎用手順） |
| `templates/repro_charcomp/RECIPE_lLBcGh4DZ8A.md` | lLBcGh4DZ8A（実況風テンプレの全手順） |

### レイアウト確定値（ReproComposition）
```
TITLE_BAR_HEIGHT = 350px
captionTop = 520px
characterSizeMultiplier = 1300
characterBottom = 55px
transformOrigin = 'center 35%'
overflow = 'visible'
```

---

## 3. 旧パイプライン（repro / repro_v2）

v1時代に作成。現在は repro_charcomp + render:repro2 に移行済み。

| ディレクトリ | 動画数 | 内容 |
|-------------|--------|------|
| `templates/repro/` | 5本 | template.json（ショット定義） |
| `templates/repro_v2/` | 5本 | audio/story/timeline分離版 |

---

## 素材

| ディレクトリ | 内容 |
|-------------|------|
| `assets/bgm/` | BGM（mp3） |
| `assets/nicocommons/` | ニコニ・コモンズ素材（背景・キャラ） |
| `assets/repro/{videoId}/` | 動画別素材（背景画像・キャラ画像・timeline.json） |
| `assets/repro/shared/` | 共有素材 |
