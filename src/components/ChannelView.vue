<template>
  <div v-if='vm' class='channel-popup'>
    <iframe width="560" height="315" :src='vm.url' frameborder="0" allowfullscreen></iframe>
  </div>
</template>

<script>
export default {
  props: ['vm']
}

</script>

<style>
.channel-popup {
  position: fixed;
  display: flex;
  z-index: 3;
  left: 0;
  bottom: 0;
  height: 315px;
}
</style>
