import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideLucideConfig } from '@lucide/angular';

export const appConfig: ApplicationConfig = {
  providers: [provideBrowserGlobalErrorListeners(), provideLucideConfig({ size: 18, strokeWidth: 2 })],
};
