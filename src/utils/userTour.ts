import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// 创建引导实例
type DriverConfig = NonNullable<Parameters<typeof driver>[0]>
type DriverSteps = NonNullable<DriverConfig['steps']>
type DriverPopover = NonNullable<DriverSteps[number]['popover']>
type DriverStepSide = DriverPopover['side']

const driverObj = driver({
  showProgress: true,
  steps: [
    // 步骤 1：欢迎
    {
      popover: {
        title: '🎉 欢迎使用 Beancount-Trans',
        description: '我们已为您准备好两个示例账单文件（微信、支付宝），让我们一起体验如何将账单转换为专业财务报表！',
        side: 'center' as unknown as DriverStepSide,
        align: 'center'
      }
    },

    // 步骤 2：文件列表
    {
      element: '#tour-file-table',
      popover: {
        title: '📁 您的示例文件',
        description: '系统已为您准备好"完整测试_微信.csv"和"完整测试_支付宝.csv"两个示例账单，当前状态为"未解析"。',
        side: 'top',
        align: 'start'
      }
    },

    // 步骤 3：解析按钮
    {
      element: '.tour-parse-first-file',
      popover: {
        title: '⚡ 开始解析账单',
        description: '点击这个按钮，系统会自动将账单转换为 Beancount 格式。解析需要几秒钟，请稍等片刻。',
        side: 'left',
        align: 'start',
        onNextClick: () => {
          // 销毁当前引导，等待用户操作
          sessionStorage.setItem('tour_in_progress', 'true');
          driverObj.destroy();
        }
      }
    },

    // 步骤 4：立即处理（横幅按钮）
    {
      element: '#tour-task-banner-button',
      popover: {
        title: '✅ 解析完成，进入审核阶段',
        description: '解析已完成！系统已为您创建了解析审核待办任务。解析结果需要经过审核确认后才会写入账本。点击"立即处理"查看并审核解析结果。',
        side: 'bottom',
        align: 'center',
        onNextClick: () => {
          // 用户点击了立即处理，会跳转到待办列表，继续下一步
          sessionStorage.setItem('tour_in_progress', 'true');
          driverObj.destroy();
        }
      }
    },

    // 步骤 5：账本管理
    {
      element: '#tour-ledger-menu',
      popover: {
        title: '📊 查看财务报表',
        description: '写入完成！点击"账本管理" → "平台账本"，查看您的专业可视化财务报表。恭喜您完成新手引导！',
        side: 'bottom',
        align: 'start'
      }
    }
  ]
});

// 启动完整引导
export function startUserTour() {
  try {
    driverObj.drive();
  } catch (error) {
    console.error('启动用户引导失败:', error);
  }
}

// 继续引导（从步骤 4 开始 - 横幅立即处理按钮）
export function continueUserTour() {
  try {
    // 等待横幅渲染完成
    setTimeout(() => {
      // 从步骤 4 开始（索引为 3）- 横幅立即处理按钮
      driverObj.drive(3);
    }, 500);
  } catch (error) {
    console.error('继续用户引导失败:', error);
  }
}

// 继续引导到步骤 5（账本管理）
export function continueUserTourToStep5() {
  try {
    // 等待页面渲染完成
    setTimeout(() => {
      // 从步骤 5 开始（索引为 4）- 账本管理
      driverObj.drive(4);
    }, 500);
  } catch (error) {
    console.error('继续用户引导到步骤5失败:', error);
  }
}

// 销毁引导
export function destroyUserTour() {
  try {
    driverObj.destroy();
  } catch (error) {
    console.error('销毁用户引导失败:', error);
  }
}
