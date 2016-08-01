import Vue from 'vue'
import App from './App'

import {init} from './models/getNativeModel.js';

init();

/* eslint-disable no-new */
new Vue({
  el: 'body',
  components: { App }
})
