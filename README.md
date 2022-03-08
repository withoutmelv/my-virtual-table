# 虚拟表格（Vue3+Element-plus支持动态行高）

### 一. 使用背景

公司项目需要在`Vue3`框架里使用虚拟表格并且支持动态行高，但是在`GitHub`找了好久没找着能支持动态行高的组件，大多数虚拟表格组件都是在开启虚拟滚动的时候启用`show-overflow-tooltip`的功能使得行高固定，从而实现固定行高的虚拟滚动（因为固定行高方便计算，易于实现），不得已只能自己实现一个支持动态行高的组件了



### 二. 版本

vue3 + element-plus ^1.1.0-beta.24

### 三. 实现原理

基于element-plus以及virtual-scroll技术封装的一个virtual-table（其实就是自己实现一个virtual-scroll，并且塞进element-plus组件内部）

1. 虚拟滚动

   1. 可视区

   原理很简单，只渲染可视区内的DOM元素 + 缓冲区内的DOM元素

   （为了滚动的顺畅感，还需要加载缓冲区内的DOM元素）

   ```js
   // 头部缓冲区长度 
   let preCount = computed(() => Math.min(data.start, 5));
   // 尾部缓冲区长度
   let nextCount = computed(() => Math.min(props.tableData.length - data.end, 5));
   // 数据层（可视区+缓冲区）data.start,data.end代表可视区的开始与结束位置
    let reportViews = computed(() => {
    	const start = data.start - preCount.value;
       const end = data.end + nextCount.value;
       // tableData是全部的数据
       return props.tableData.slice(start, end);
    });
   ```

   2. 滚动区

      数据区完成之后，还需要一个滚动区支撑起整个表格的真实数据量的高度

   于是要在element-plus的组件内加入一个div，这个div需要带有真实数据量的高度

   （这里需要注意新版本的element-plus的内部结构与类有变化）

   ```js
   // 旧版element-plus
   const initVirtualTable = () => {
       nextTick(() => {
           // 获取element-plus的wrapper层
           data.tableBody = data.table.$el.getElmentsByClassName('el-table__body-wrapper')[0];
           // 创建滚动区并且塞进wrapper层里面，支撑起表格的真实高度
           data.scrollBar = document.createElement('div');
           data.scrollBar.id = 'scrollBar';
           data.scrollBar.style.height = (props.tableData.length - 1) * props.rowHeight + 'px';
           data.tableBody.append(data.scrollBar);
           // 添加滚动事件，因为滚动区的支撑，wrapper层的高度数据是真实的，每次可以根据滚动的高度去计算出可视区的开始位置data.start
           data.tableBody.addEventListener('scroll', scrollHandle);
       })
   };
   
   // 新版element-plus
   const initVirtualTable = () => {
         data.tableBody = data.table.$el.getElementsByClassName(
           'el-scrollbar__wrap el-scrollbar__wrap--hidden-default'
         )[0];
         data.scrollBar = document.createElement('div');
         data.scrollBar.id = 'scrollBar';
         data.scrollBar.style.height = (props.tableData.length - 1) * props.rowHeight + 'px';
         const t = data.tableBody.getElementsByClassName('el-scrollbar__view')[0];
         t.append(data.scrollBar);
         data.tableBody.addEventListener('scroll', scrollHandle);
       };
   ```

   ​	滚动事件的实现，滚动事件需要实现的功能： 每次滚动后计算出新的可视区位置（缓冲区是计算属性会跟着变换），从而更新数据区的数据，并且移动主体区

   ```js
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
   
   
   const getStartIndex = (value) => {
       // 二分搜索查找开始位置
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
   }
   
   const computeEndByTableHeight = () => {
       // 根据表格的高度（由外层传入的数据props.tableHeight）以及data.start来计算出data.end结束的位置
       let total = 0;
       let index = data.start;
       while(total < props.tableHeight && index < positions.length) {
           total += positions[index].height;
           index++;
       }
       return index;
   }
   ```

   3. 动态高度

      那么到这里了，动态高度是如何实现的

      1. 首先要给每个表格的每一行设置一个初始的行高(props.rowHeight)，这个行高不能和实际的高度相差太多（初始化行高）

         ```js
         const inintPositions = () => {
             positions = [];
             // 选中框的状态更新, 虚拟表格导致组件里面的选中框无法正常使用，所以需要自己重写一个原生的
             data.selectAlls = props.tableData.length && props.tableData.every(item => item.checked);
             if (data.selectAllRef) {
                 data.selectAllRef.value = data.selectAlls;
             }
             props.tableData.forEach((item, index) => {
                 item.rowId = index; // 用来后面表示每一个DOM元素
                 
                 // 这里是为了解决树形展开导致高度计算错误的问题，不需要使用树形表格的不用理会
                 if (item.children && item.children.length > 0) {
                     item.children.forEach((c, i) => {
                         c.rowId = index;
                     });
                 }
                 
                 // 记录初始化行高
                 positions.push({
                     height: props.rowHeight,
                     top: index * props.rowHeight,
                     bottom: (index + 1) * props.rowHeight,
                 })
             });
         }
         ```

         

      2. 每一次滚动的时候（会触发onUpdate生命周期），在这时候进行实际行高的记录（更新行高）

         ```js
         const setClassName = ({ row }) => {
            return 'row_' + row.rowId;
         }
         
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
                 while(j >= 1 && temp.className !== `el-table__row row_${index} el-table__row--level-0` && temp.className !== `el-table__row row_${index}`) {
                     if (nodes[j - 1].style.display !== 'none') {
                         rect.unshift(nodes[j - 1].getBoundingClientRect());
                     }
                     temp = nodes[j - 1];
                     j--;
                 }
                 let totalRectHeight = 0;
                 rect.forEach(r => {
                    totalRectHeight += r.height 
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
         }
         ```

         