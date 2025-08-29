import { Component, OnInit } from '@angular/core';
import { DocenteService } from './docente.service';

@Component({
  selector: 'app-docentes',
  templateUrl: './docente.component.html',
})
export class DocenteComponent implements OnInit {
  docentes: any[] = [];
  newDocente = {full_name: '', email: '', telefono: '' };

  constructor(private docenteService: DocenteService) {}

  ngOnInit(): void {
    this.loadDocentes();
  }

  loadDocentes() {
    this.docenteService.getDocentes().subscribe(data => {
      this.docentes = data;
    });
  }

  createDocente() {
    this.docenteService.createDocente(this.newDocente).subscribe(() => {
      this.newDocente = { full_name: '', email: '', telefono: '' };
      this.loadDocentes();
    });
  }
}
