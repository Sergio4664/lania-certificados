import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `
    <div>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    div {
      min-height: 100vh;
      font-family: Arial, sans-serif;
    }
  `]
})
export class AppComponent {
  title = 'LANIA Certificaciones';
}