import { Component, input, output, ViewEncapsulation } from '@angular/core';

// Reusable yes/no modal (Week 4: content projection with <ng-content />).
// The parent supplies the title, the button labels, and the message markup;
// the modal only owns the shell and raises confirmed / cancelled.
// ViewEncapsulation.None: the projected content is compiled in the PARENT's
// scope, so the .confirm-modal p rules below would not reach it under the
// default emulated encapsulation. The rules are all scoped by .confirm-modal,
// so nothing leaks to the rest of the app.
@Component({
  selector: 'app-confirm-modal',
  imports: [],
  templateUrl: './confirm-modal.html',
  styleUrl: './confirm-modal.css',
  encapsulation: ViewEncapsulation.None
})
export class ConfirmModal {
  title = input.required<string>();
  confirmLabel = input('Delete');
  cancelLabel = input('Cancel');
  danger = input(true);   // confirm button uses the red .danger style
  confirmed = output<void>();
  cancelled = output<void>();
}
