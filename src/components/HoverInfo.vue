<template>
  <div v-if='vm' class='item-tooltip' v-bind:style="{ left: x + 'px', top: y + 'px' }">
    <img :src='vm.thumbnail'/>
    <div class='tooltip-details'>
      <h4>{{vm.title}} <span class='subs'>
      {{vm.subscribers}} subscribers</span>
      </h4>
    </div>
  </div>
</template>

<script>
export default {
  props: ['vm'],
  computed: {
    x() {
      var vm = this.vm;
      if (!vm.pos) return 0;
      var x = vm.pos.x;
      return Math.min(x, window.innerWidth - 330)
    },
    y() {
      var vm = this.vm;
      if (!vm.pos) return 0;
      var y = vm.pos.y;
      return Math.min(y, window.innerHeight - 90)
    }
  }
}

</script>

<style>
.item-tooltip {
  position: fixed;
  display: flex;
  z-index: 3;
  flex-direction: row;
  box-shadow: 0 0 20px rgba(255,255,255,0.8);
  width: 320px;
  height: 80px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.8);
}

.item-tooltip h4 {
  margin-top: 8px;
  color: #aaa;
  font-family: 'PT Sans',sans-serif;
}
.item-tooltip h4 .subs {
  color: #eee;
  font-size: 12px;
}

.item-tooltip img {
  border-radius: 8px;
  padding-right: 8px;
}
</style>
