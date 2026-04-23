import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { UserHeaderComponent } from '../user-header/user-header.component';
import { UserFooterComponent } from '../user-footer/user-footer.component';

import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-user-layout',
  standalone: true,
  imports: [RouterOutlet, UserHeaderComponent, UserFooterComponent, ToastModule],
  templateUrl: './user-layout.component.html',
  styleUrl: './user-layout.component.scss'
})
export class UserLayoutComponent {

}
