<script setup lang="ts">
// ルートはレイアウト＋ページに委譲。各ページが layout を選ぶ（既定 default / 認証は auth）。
</script>

<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </div>
</template>
