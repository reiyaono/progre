### 今後やりたいこと
- [難易度: 中] サプリの接種もカレンダー化したい
- [難易度: 中] 場所の概念を追加したい、workoutに対して1:1で紐づく、とりあえず場所名だけ入力できるように。過去に使った場所名を頻出順で選択できると嬉しい
- [難易度: 低, 優先度: 低] export機能が欲しい 

### 完了
- [x] [難易度: 低] セット入力時刻の表示 — SetRowに🕒HH:MM（JST）。直近セットの判別用
- [x] [難易度: 低] セット追加でグラフ連動 — 追加/編集/削除後に筋ボリューム/トップセット推移を refresh
- [x] [難易度: 低] 前回記録テキストから前回セットへ遷移 — LastRecordBadgeをリンク化（last APIに workoutExerciseId 追加）
- [x] [難易度: 中] エクササイズ詳細画面のレイアウト変更 — 前回比較バッジ→セット表→セット追加→メモ→筋ボリューム推移→トップセット推移。種目別ボリューム推移エンドポイント新設
- [x] [難易度: 中] 有酸素は「分のみ」記録 — body_part.name='有酸素'で判定。weight/reps=null＋duration_sec、集計は重量系から除外。入力UIを分ステッパーに出し分け
- [x] [難易度: 中] 自重は「回数のみ」記録 — training_method.name='自重'で判定。weight=null＋reps（duration_sec=null）。表示/集計は `weight is null and reps is not null` で識別。`mode_check` に回数のみモードを追加、`v_exercise_max_reps`／`fn_add_bodyweight_set` 新設、入力UIを回数ステッパーに出し分け、グラフは「最大回数の推移」を表示（前回比較バッジは現状非表示・known-issues §2）
- [x] [難易度: 小] DBデータ取得中のローディング表示 — 共通スピナー＋取得をlazy化。カレンダー/ダッシュボード等で取得中に空状態を早出ししないよう修正
- [x] [難易度: 中] ダークモードカラーの追加 — CSS変数テーマ＋トグル＋OS既定＋永続化（FOUC防止）
- [x] [難易度: 小] faviconの設定 — バーベル風SVG favicon
- [x] [難易度: 小] アプリ名を決める — **PROGRE**（progressive overload 由来）
