﻿<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import moment from "moment";

const props = defineProps({
  dateUtc: String,
  default: function () {
    return "0001-01-01T00:00:00";
  },
});

var interval = null;

const title = ref(),
  text = ref();

function updateText() {
  if (props.dateUtc !== "0001-01-01T00:00:00" && props.dateUtc != undefined) {
    const m = moment.utc(props.dateUtc);
    text.value = m.fromNow();
    title.value = m.local().format("LLLL") + " (local)\n" + m.utc().format("LLLL") + " (UTC)";
  } else {
    text.value = "n/a";
    title.value = "n/a";
  }
}

onMounted(() => {
  interval = setInterval(function () {
    updateText();
  }, 5000);

  updateText();
});

onUnmounted(() => clearInterval(interval));
</script>

<template>
  <span :title="title">{{ text }}</span>
</template>

<style></style>
