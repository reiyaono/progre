<script setup lang="ts">
// カレンダー月グリッドの1日ぶんのセル。日番号と実施部位ドットを表示する。

defineProps<{
  date: string | null  // 'YYYY-MM-DD'。null は前月/翌月埋めの空白セル
  day: number | null   // 表示する日(1..31)。null なら空白セル
  colors: string[]     // その日の実施部位のユニーク色配列（空配列あり得る）
  isToday: boolean     // 今日のセルか
  isSelected?: boolean // 選択中（プレビュー表示中）のセルか
  hasSupplement?: boolean // その日サプリ摂取あり（💊マーク）
}>()

const emit = defineEmits<{ select: [date: string] }>()

// ドット表示上限
const MAX_DOTS = 4

function handleClick(date: string | null) {
  // 空白セルはクリック無効
  if (date !== null) emit('select', date)
}
</script>

<template>
  <!-- 空白セル（前月/翌月埋め） -->
  <div v-if="date === null" class="cell cell--empty" aria-hidden="true" />

  <!-- 通常セル -->
  <button
    v-else
    type="button"
    class="cell cell--active"
    :class="{ 'cell--selected': isSelected }"
    :aria-label="`${day}日`"
    :aria-current="isToday ? 'date' : undefined"
    :aria-pressed="isSelected"
    @click="handleClick(date)"
  >
    <!-- サプリ摂取マーク（部位ドットとは独立。右上） -->
    <span v-if="hasSupplement" class="supp-mark" aria-label="サプリ摂取あり">💊</span>

    <!-- 日番号 -->
    <span class="day-num" :class="{ 'day-num--today': isToday }">{{ day }}</span>

    <!-- 部位カラードット -->
    <div v-if="colors.length" class="dots">
      <span
        v-for="(color, i) in colors.slice(0, MAX_DOTS)"
        :key="i"
        class="dot"
        :style="{ background: color }"
      />
      <!-- 5個以上なら余剰数を表示 -->
      <span v-if="colors.length > MAX_DOTS" class="dot-overflow">
        +{{ colors.length - MAX_DOTS }}
      </span>
    </div>
  </button>
</template>

<style scoped>
/* ===== セル共通 ===== */
.cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 4px;
  min-height: 52px;
  padding: 6px 4px 4px;
  border-radius: 8px;
  box-sizing: border-box;
}

/* 空白セル: 背景なし・操作なし */
.cell--empty {
  background: transparent;
  cursor: default;
}

/* 通常セル: ボタンリセット + タップ可 */
.cell--active {
  background: var(--surface);
  border: 1px solid var(--border);
  cursor: pointer;
  color: var(--text);
  font-family: inherit;
  transition: background 0.15s;
}
.cell--active:active {
  background: var(--bg);
}

/* 選択中（プレビュー表示中）: アクセント枠で強調（今日の丸塗りと併存可） */
.cell--selected {
  border-color: var(--accent);
  box-shadow: inset 0 0 0 1px var(--accent);
}

/* サプリ摂取マーク（セル右上・ドットと独立） */
.supp-mark {
  position: absolute;
  top: 2px;
  right: 3px;
  font-size: 0.6rem;
  line-height: 1;
  pointer-events: none;
}

/* ===== 日番号 ===== */
.day-num {
  font-size: 0.82rem;
  line-height: 1;
  color: var(--text);
}

/* 今日: アクセントカラーの丸背景で強調 */
.day-num--today {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
}

/* ===== ドット列 ===== */
.dots {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 2px;
}

/* 部位カラードット */
.dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 余剰数テキスト */
.dot-overflow {
  font-size: 0.6rem;
  color: var(--muted);
  line-height: 1;
}
</style>
