<template>
  <div>
    <el-table
      class="virtual-table"
      ref="table"
      :data="reportViews"
      style="width: 100%"
      :height="tableHeight"
      :row-class-name="setClassName"
    >
      <el-table-column type="index" width="40">
        <template #header="{}">
          <input ref="selectAllRef" type="checkbox" v-model="selectAlls" @change="onSelectAll" />
        </template>
        <template #default="{ row }">
          <input type="checkbox" v-model="row.checked" @change="() => onSelect(row)" />
        </template>
      </el-table-column>
      <el-table-column type="selection" width="80" />
      <el-table-column prop="rowId" label="No." width="80" />
      <el-table-column prop="name" label="Name" width="180" />
      <el-table-column prop="date" label="Date" width="180" :formatter="formatDate" />
      <el-table-column prop="description" label="Description" />
      <el-table-column prop="address" label="Address" />
      <el-table-column label="Setting">
        <template #default="{ row }">
          <el-radio-group v-model="row.radio">
            <el-radio :label="1">Option A</el-radio>
            <el-radio :label="2">Option B</el-radio>
          </el-radio-group>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script>
/* eslint-disable prettier/prettier */
import moment from 'moment';
import {
  computed,
  nextTick,
  onMounted,
  reactive,
  toRefs,
  ref,
  onUpdated,
  watch,
  watchEffect,
} from 'vue';
// import {debounce} from 'throttle-debounce';
export default {
  props: {
    tableData: {
      type: Array,
      default: () => [],
    },
    tableHeight: {
      type: Number,
      default: 800,
    },
    rowHeight: {
      type: Number,
      default: 48,
    },
  },
  setup(props, ctx) {
    const table = ref(null);
    const selectAllRef = ref(null);
    const data = reactive({
      selectAlls: false,
      start: 0,
      end: Math.floor(props.tableHeight / props.rowHeight),
      offsetY: 0,
      tableBody: null,
      scrollBar: null,
      table,
      selectAllRef,
      selectArr: [],
    });
    let positions = [];
    // let oldTableData = [];

    const computeEndByTableHeight = () => {
      // 根据表格的高度（由外层传入的数据props.tableHeight）以及data.start来计算出data.end结束的位置
      let total = 0;
      let index = data.start;
      while (total < props.tableHeight && index < positions.length) {
        total += positions[index].height;
        index++;
      }
      return index;
    };

    watch(
      () => props.tableHeight,
      () => {
        console.log(props.tableHeight);
        data.end = computeEndByTableHeight();
      }
    );

    watch(
      () => props.tableData,
      () => {
        data.end = computeEndByTableHeight();
      }
    );

    const updatedPositions = () => {
      nextTick(() => {
        // 根据DOM上面className的rowId来获取对应DOM的行高
        const nodes = data.tableBody && data.tableBody.querySelectorAll('.el-table__row');
        if (!nodes || nodes.length === 0) return;
        nodes.forEach((node, i) => {
          const index = +node.className.match(/\d+/g)[0];
          const rect = [];
          rect.unshift(node.getBoundingClientRect());
          let temp = node;
          let j = i;
          // 这里是为了处理树形表格的高度问题，不需要使用的可以不看
          while (
            j >= 1 &&
            temp.className !== `el-table__row row_${index} el-table__row--level-0` &&
            temp.className !== `el-table__row row_${index}`
          ) {
            if (nodes[j - 1].style.display !== 'none') {
              rect.unshift(nodes[j - 1].getBoundingClientRect());
            }
            temp = nodes[j - 1];
            j--;
          }
          let totalRectHeight = 0;
          rect.forEach(r => {
            totalRectHeight += r.height;
          });
          const oldHeight = positions[index].height;
          const val = oldHeight - totalRectHeight;
          if (val) {
            positions[index].height = totalRectHeight;
            positions[index].bottom = positions[index].bottom - val;
            for (let i = index + 1; i < positions.length; i++) {
              positions[i].top = positions[i - 1].bottom;
              positions[i].bottom = positions[i].bottom - val;
            }
          }
        });
        data.scrollBar.style.height = positions[positions.length - 1].bottom + 'px';
      });
    };

    const initPositions = () => {
      console.log(1111);
      positions = [];
      data.selectAlls = props.tableData.every(item => item.checked === true);
      if (data.selectAllRef) {
        data.selectAllRef.value = data.selectAlls;
      }
      props.tableData.forEach((item, index) => {
        item.rowId = index;
        if (item.children && item.children.length > 0) {
          item.children.forEach(c => {
            c.rowId = index;
          });
        }
        positions.push({
          height: props.rowHeight,
          top: index * props.rowHeight,
          bottom: (index + 1) * props.rowHeight,
        });
      });
      updatedPositions();
    };

    watchEffect(() => {
      initPositions();
    });

    let preCount = computed(() => Math.min(data.start, 5));
    let nextCount = computed(() => Math.min(props.tableData.length - data.end, 5));
    let reportViews = computed(() => {
      const start = data.start - preCount.value;
      const end = data.end + nextCount.value;
      console.log(data.start, data.end);
      return props.tableData.slice(start, end);
    });

    const formatDate = row => {
      return moment(row.date).format('YYYY-MM-DD hh:mm:ss');
    };

    const setClassName = ({ row }) => {
      return 'row_' + row.rowId;
    };

    const getStartIndex = value => {
      // 二分搜索查找当前scroll的高度对应的索引值
      let start = 0;
      let end = props.tableData.length - 1;
      let temp = null;
      while (end > start) {
        const middleIndex = parseInt((start + end) / 2);
        const middleValue = positions[middleIndex].bottom;
        if (middleValue === value) {
          return middleIndex + 1;
        } else if (middleValue < value) {
          start = middleIndex + 1;
        } else if (middleValue > value) {
          end = middleIndex - 1;
          if (temp === null || temp > middleIndex) {
            temp = middleIndex;
          }
        }
      }
      return temp;
    };

    const scrollHandle = () => {
      let scrollTop = data.tableBody.scrollTop;
      data.start = getStartIndex(scrollTop);
      data.end = computeEndByTableHeight();
      data.offsetY = positions[data.start - preCount.value]
        ? positions[data.start - preCount.value].top
        : 0;
      const child = data.tableBody.getElementsByClassName('el-table__body')[0];
      child.style.top = `${data.offsetY}px`;
    };

    const initVirtualTable = () => {
      nextTick(() => {
        data.tableBody = data.table.$el.getElementsByClassName(
          'el-scrollbar__wrap el-scrollbar__wrap--hidden-default'
        )[0];
        data.scrollBar = document.createElement('div');
        data.scrollBar.id = 'scrollBar';
        data.scrollBar.style.height = (props.tableData.length - 1) * props.rowHeight + 'px';
        const t = data.tableBody.getElementsByClassName('el-scrollbar__view')[0];
        t.append(data.scrollBar);
        data.tableBody.addEventListener('scroll', scrollHandle);
      });
    };

    // 旧版element-plus
    // const initVirtualTable = () => {
    //     nextTick(() => {
    //         // 获取element-plus的wrapper层
    //         data.tableBody = data.table.$el.getElmentsByClassName('el-table__body-wrapper')[0];
    //         // 创建滚动区并且塞进wrapper层里面，支撑起表格的真实高度
    //         data.scrollBar = document.createElement('div');
    //         data.scrollBar.id = 'scrollBar';
    //         data.scrollBar.style.height = (props.tableData.length - 1) * props.rowHeight + 'px';
    //         data.tableBody.append(data.scrollBar);
    //         // 添加滚动事件，因为滚动区的支撑，wrapper层的高度数据是真实的，每次可以根据滚动的高度去计算出可视区的开始位置data.start
    //         data.tableBody.addEventListener('scroll', scrollHandle);
    //     })
    // };


    const onSelect = s => {
      if (s.checked) {
        data.selectArr.push(s);
      } else {
        let index = data.selectArr.findIndex(a => a.guid === s.guid);
        data.selectArr.splice(index, 1);
      }
      ctx.emit('changeSelect', s);
    };

    const onSelectAll = () => {
      data.selectAlls = !data.selectAlls;
      if (data.selectAlls) {
        data.selectArr = [...props.tableData];
      } else {
        data.selectArr = [];
      }
      ctx.emit('changeSelectAll', data.selectAlls);
    };

    const getCheckboxRow = () => {
      return data.selectArr;
    };

    const clearCheckboxRow = () => {
      data.selectArr = [];
    };

    onMounted(() => {
      initVirtualTable();
      updatedPositions();
      window.data = data;
    });

    onUpdated(() => {
      console.log('');
      updatedPositions();
    });

    return {
      ...toRefs(data),
      reportViews,
      formatDate,
      onSelect,
      onSelectAll,
      setClassName,
      getCheckboxRow,
      clearCheckboxRow,
      updatedPositions,
    };
  },
};
</script>

<style lang="less">
.virtual-table .el-scrollbar__wrap.el-scrollbar__wrap--hidden-default {
  position: relative;
}
.virtual-table .el-table__body {
  position: absolute;
}
</style>
