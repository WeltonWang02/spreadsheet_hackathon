interface SpreadsheetEntity {
  id: string;
  name: string;
  subEntities: {
    [key: string]: { [columnName: string]: string }
  };
}

interface GlobalState {
  headers: string[];
  entities: SpreadsheetEntity[];
}

const STORAGE_KEY = 'spreadsheet_state';

export class SpreadsheetStorage {
  private state: GlobalState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): GlobalState {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    return {
      headers: [],
      entities: []
    };
  }

  private saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  getState(): GlobalState {
    return this.state;
  }

  updateHeaders(headers: string[]) {
    this.state.headers = headers;
    
    // Update all entity column mappings
    this.state.entities.forEach(entity => {
      const oldSubEntities = entity.subEntities;
      const newSubEntities: { [key: string]: { [columnName: string]: string } } = {};

      // For each row in the entity
      Object.keys(oldSubEntities).forEach(rowKey => {
        const oldRow = oldSubEntities[rowKey];
        const newRow: { [columnName: string]: string } = {};

        // Map old values to new headers, keeping values where headers still exist
        headers.forEach(header => {
          if (oldRow.hasOwnProperty(header)) {
            newRow[header] = oldRow[header];
          } else {
            newRow[header] = '';
          }
        });

        newSubEntities[rowKey] = newRow;
      });

      entity.subEntities = newSubEntities;
    });

    this.saveState();
  }

  createEntity(name: string): SpreadsheetEntity {
    const entity: SpreadsheetEntity = {
      id: crypto.randomUUID(),
      name,
      subEntities: {}
    };

    this.state.entities.push(entity);
    this.saveState();
    return entity;
  }

  updateEntity(id: string, updates: Partial<SpreadsheetEntity>) {
    const entity = this.state.entities.find(e => e.id === id);
    if (entity) {
      Object.assign(entity, updates);
      this.saveState();
    }
  }

  deleteEntity(id: string) {
    this.state.entities = this.state.entities.filter(e => e.id !== id);
    this.saveState();
  }

  updateSubEntity(entityId: string, rowKey: string, columnName: string, value: string) {
    const entity = this.state.entities.find(e => e.id === entityId);
    if (!entity) return;

    if (!entity.subEntities[rowKey]) {
      entity.subEntities[rowKey] = {};
    }

    entity.subEntities[rowKey][columnName] = value;
    this.saveState();
  }

  initializeEntityRows(entityId: string, rowCount: number) {
    const entity = this.state.entities.find(e => e.id === entityId);
    if (!entity) return;

    // Initialize empty rows if they don't exist
    for (let i = 0; i < rowCount; i++) {
      const rowKey = i.toString();
      if (!entity.subEntities[rowKey]) {
        entity.subEntities[rowKey] = {};
        this.state.headers.forEach(header => {
          entity.subEntities[rowKey][header] = '';
        });
      }
    }

    this.saveState();
  }

  // Helper method to convert storage format to component format
  getEntityData(entityId: string): Array<Array<{ value: string; row: number; col: number }>> {
    const entity = this.state.entities.find(e => e.id === entityId);
    if (!entity) return [];

    const rows: Array<Array<{ value: string; row: number; col: number }>> = [];
    
    Object.keys(entity.subEntities).forEach((rowKey, rowIndex) => {
      const row: Array<{ value: string; row: number; col: number }> = [];
      this.state.headers.forEach((header, colIndex) => {
        row.push({
          value: entity.subEntities[rowKey][header] || '',
          row: rowIndex,
          col: colIndex
        });
      });
      rows[parseInt(rowKey)] = row;
    });

    return rows;
  }
} 