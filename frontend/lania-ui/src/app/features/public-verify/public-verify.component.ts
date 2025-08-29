// src/app/features/public-verify/public-verify.component.ts
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Component({
  standalone: true,
  selector: 'app-public-verify',
  imports: [CommonModule],
  template: `
    <h2>Verificación de constancia</h2>
    <ng-container *ngIf="cert; else notFound">
      <p><strong>Serial:</strong> {{cert.serial}}</p>
      <p><strong>Tipo:</strong> {{cert.kind}}</p>
      <p><strong>Estatus:</strong> {{cert.status}}</p>
      <button (click)="download()">Descargar PDF</button>
    </ng-container>
    <ng-template #notFound><p>No encontrada o no disponible.</p></ng-template>
  `
})
export default class PublicVerifyComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  cert: any;
  ngOnInit(){
    const token = this.route.snapshot.paramMap.get('token');
    this.http.get(`http://127.0.0.1:8000/v/t/${token}`).subscribe(r => this.cert=r);
  }
  download(){ window.open(`http://127.0.0.1:8000/v/serial/${this.cert.serial}/pdf`, '_blank'); }
}
