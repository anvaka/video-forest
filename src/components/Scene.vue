<template>
  <div class="container" v-el:container>
    <hover-info :vm='tooltip'></hover-info>
    <channel-view :vm='preview'></channel-view>
  </div>
</template>

<script>
import createRenderer from '../lib/renderer.js';
import bus from '../models/bus.js';
import getNativeModel from '../models/getNativeModel.js';
import debounce from 'lodash/debounce';
import request from '../lib/utils/request.js';
import HoverInfo from './HoverInfo.vue';
import ChannelView from './ChannelView.vue';

var youtubeClient = require('../lib/utils/youtubeClient.js')(request);
var getLabel = require('../models/getLabel.js');

export default {
  ready() {
    bus.on('tree-ready', this.treeDownloaded, this)
  },

  components: {
    HoverInfo,
    ChannelView
  },

  methods: {
    treeDownloaded() {
      let container = this.$els.container

      this.renderer = createRenderer(container, getNativeModel().tree)
      let self = this;

      this.renderer.on('click', function(p) {
        getLabel(p).then(channelId => {
          if (channelId[0] === 'U' && channelId[1] === 'C') {
            let playList = 'UU' + channelId.substr(2);

            self.preview = {
              url: 'https://www.youtube.com/embed/videoseries?list=' + playList + '&autoplay=1'
            };
          } else {
            self.preview = null;
          }
        });
      })

      this.renderer.on('hover', debounce(onHover, 100));

      function onHover(p) {
        console.log(+new Date(), 'hover handler', p)

        if (!p || typeof p.id === 'undefined') {
          self.tooltip = null;
          return;
        }

        getLabel(p).then(channelId => {
          youtubeClient.getChannelInfo(channelId).then(function(info) {
            if (info) {
              info.pos = p.pos;
              self.tooltip = info;
            } else {
              // I have old data set. sometimes there is no channels
              self.tooltip = null;
            }
          });
        });
      }
    }
  },

  destroyed() {
    this.renderer.dispose()
    bus.off('tree-ready', this.treeDownloaded);
  },

  data () {
    return {
      tooltip: null,
      preview: null
    }
  }
}

</script>

<style>
.container {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
}
</style>
