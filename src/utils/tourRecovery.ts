import { getTourProgress, shouldResumeTour, resumeTourFromStep } from './userTour';
import type { Router } from 'vue-router';

/**
 * 获取步骤所需的页面路由
 */
export function getRequiredRouteForStep(stepIndex: number): string {
  // 步骤 1-3: /file 页面
  if (stepIndex >= 0 && stepIndex <= 2) {
    return '/file';
  }
  // 步骤 4: /file 页面（TaskBanner 在此页面）
  if (stepIndex === 3) {
    return '/file';
  }
  // 步骤 5: 任何有 BaseHeader 的页面都可以（/file, /reconciliation, /config/* 等）
  if (stepIndex === 4) {
    // 返回当前路由，因为步骤5可以在任何页面显示
    return '';
  }
  return '/file';
}

/**
 * 检查当前路由是否匹配步骤所需的路由
 */
export function isRouteMatchForStep(stepIndex: number, currentPath: string): boolean {
  const requiredRoute = getRequiredRouteForStep(stepIndex);
  
  // 步骤5可以在任何有 BaseHeader 的页面显示
  if (stepIndex === 4) {
    // 排除登录、手机绑定、OAuth回调等页面
    const excludedPaths = ['/login', '/phone-binding', '/auth/github/token', '/'];
    return !excludedPaths.includes(currentPath);
  }
  
  return currentPath === requiredRoute;
}

/**
 * 确保在正确的页面，如果不在则跳转
 * @param stepIndex 步骤索引
 * @param router Vue Router 实例
 * @param currentPath 当前路径
 * @returns 是否需要跳转
 */
export function ensureCorrectRoute(
  stepIndex: number,
  router: Router,
  currentPath: string
): boolean {
  const requiredRoute = getRequiredRouteForStep(stepIndex);
  
  // 步骤5可以在任何页面显示，不需要跳转
  if (stepIndex === 4 && requiredRoute === '') {
    return false;
  }
  
  // 如果当前路径不匹配，需要跳转
  if (currentPath !== requiredRoute) {
    router.push(requiredRoute);
    return true;
  }
  
  return false;
}

/**
 * 检查并恢复导览
 * @param router Vue Router 实例
 * @param currentPath 当前路径
 * @returns 是否成功恢复导览
 */
export function checkAndResumeTour(router: Router, currentPath: string): boolean {
  if (!shouldResumeTour()) {
    return false;
  }
  
  const progress = getTourProgress();
  if (!progress) {
    return false;
  }
  
  const { currentStep } = progress;
  
  // 检查当前路由是否匹配
  if (!isRouteMatchForStep(currentStep, currentPath)) {
    // 需要跳转到正确页面
    const needsRedirect = ensureCorrectRoute(currentStep, router, currentPath);
    if (needsRedirect) {
      // 跳转后，在目标页面的 onMounted 中会再次调用此函数
      return false;
    }
  }
  
  // 在正确页面，恢复导览
  resumeTourFromStep(currentStep);
  return true;
}

