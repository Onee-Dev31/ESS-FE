import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';

export default [provideHttpClientTesting(), provideRouter([])];
