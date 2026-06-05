import { Component, inject } from '@angular/core';
import { ReaderService } from '../../services/reader.service';

@Component({
  selector: 'app-bottom-bar',
  imports: [],
  templateUrl: './bottom-bar.component.html',
})
export class BottomBarComponent {
  reader = inject(ReaderService);
}
