<template>
    <div id="loading-progress" class="loading-progress" :style="{ '--background': option.background, '--color': option.textColor, '--height': option.height}" v-if="option.show">
      <div class="loading-progress-box">
        <div class="loading-progress-animation" v-for="item in 6" :key="item">
          <span :class="'loading-progress-item' + index" class="loading-progress-item" v-for="(item,index) in 2"
                :key="item"></span>
        </div>
        <div class="loading-progress-text">{{ option.text }}</div>
      </div>
    </div>
  </template>
<script>
export default {
  name: 'YbLoading',
  props: {
    option: {
      type: Object,
      default () {
        return {
          text: '加载中，请稍后',
          height: '100vh',
          background: '#333333', // 遮罩层背景
          show: false,
          progress: 0,
          textColor: '#06D4D6'
        }
      }
    }
  },
  data () {
    return {}
  }
}
</script>
  <style scoped lang="scss">
  @keyframes loading {
    0% {
      transform: scale(1);
      background-color: #DBDBDB;
    }
    50% {
      transform: scale(1.5);
      background-color: var(--color);
    }
    100% {
      transform: scale(1);
      background-color: #DBDBDB;
    }
  }

  .loading-progress {
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: var(--height);
    background: var(--background);
    opacity: 0.8;
    z-index: 99999;

    &-box {
      width: 160px;
      height: 160px;
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      margin: auto;
    }

    &-text {
      position: absolute;
      bottom: 0;
      text-align: center;
      font-size: 20px;
      font-weight: 400;
      width: 100%;
      color: var(--color);
    }

    &-animation {
      width: 10px;
      height: 75px;
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      bottom: 0;
      margin: auto;

      @for $i from 2 through 6 {
        &:nth-child(#{$i}) {
          transform: rotate(#{($i - 1) * 30}deg);
        }
      }

      @for $i from 1 through 6 {
        &:nth-of-type(#{$i}) > .loading-progress-item0 {
          animation-delay: #{($i - 1) * 0.125 }s;
        }

        &:nth-of-type(#{$i}) > .loading-progress-item1 {
          animation-delay: #{ 6 * 0.125 + ($i - 1) * 0.125 }s;
        }
      }
    }

    &-item {
      animation: loading 1.375s linear infinite;
    }

    &-item0, &-item1 {
      display: block;
      width: 10px;
      height: 10px;
      background: #DBDBDB;
      border-radius: 50%;
      position: absolute;
    }

    &-item0 {
      top: 0;
    }

    &-item1 {
      bottom: 0;
    }
  }
  </style>
