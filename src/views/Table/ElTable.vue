<template>
  <div>
    <div><el-button @click="pushData">增加</el-button></div>
    <MyTable :table-data="tableData" :table-height="tableContentHeight" :row-height="50" @changeAllSelect="changeAllSelect" @changeSelect="changeSelect" />
  </div>
</template>

<script>
// MyTable是消息中心定制版本,使用websocket订阅后台告警,所以数据会实时更新
import MyTable from './components/MyTable.vue';
import Mock from 'mockjs';
import { reactive, toRefs } from 'vue';
// import _ from 'lodash';

export default {
  components: {
    MyTable,
  },
  setup() {
    const data = reactive({
      tableData: [],
      tableContentHeight: 0,
    });
    let items = [];
    setTimeout(() => {
      for (let i = 0; i < 300; i++) {
        items.push({
          rowId: i,
          guid: i,
          name: Mock.Random.sentence(2),
          description: Mock.Random.sentence(18),
          address: Mock.Random.sentence(4),
          date: new Date(Date.now() - parseInt(Math.random() - 10000)),
          radio: null,
          checked: false,
        });
      }
      data.tableData = items;
    }, 2000);
    setTimeout(() => {
      data.tableContentHeight = window.screen.height - 120;
      window.onresize = () => {
        console.log(222);
        data.tableContentHeight = window.screen.height - 120;
      };
    }, 3000);

    const pushData = () => {
      let test = [];
      for (let i = 0; i < 150; i++) {
        test.push({
          rowId: i + 300,
          guid: i + 300,
          name: Mock.Random.sentence(2),
          description: Mock.Random.sentence(18),
          address: Mock.Random.sentence(4),
          date: new Date(Date.now() - parseInt(Math.random() - 10000)),
          radio: null,
          checked: false,
        });
      }
      data.tableData.push(...test);
    };

    const changeSelect = (row) => {
      data.tableData.forEach(s => {
        if (s.guid === row.guid) {
          s = row;
        }
      });
    };

    const changeAllSelect = (flag) => {
      data.tableData.map(s => {
        s.checked = flag;
      });
    };

    return {
      ...toRefs(data),
      pushData,
      changeSelect,
      changeAllSelect,
    };
  },
};
</script>

<style scoped lang="less"></style>
