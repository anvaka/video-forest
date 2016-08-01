<template>
  <div id="app">
    <scene></scene>
  </div>
</template>

<script>
import Scene from './components/Scene'

export default {
  components: {
    Scene
  }
}
</script>

<style>
html {
  height: 100%;
}

body {
  height: 100%;
  width: 100%;
  position: absolute;
  overflow: hidden;
  margin: 0;
  background: black;
}
</style>
