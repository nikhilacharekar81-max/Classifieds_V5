import type { Pool, PoolClient, QueryResult } from 'pg';

export type ColumnDataType =
  | 'varchar'
  | 'text'
  | 'boolean'
  | 'integer'
  | 'numeric'
  | 'timestamp'
  | 'doublePrecision'
  | 'jsonb';

export interface ColumnDef<TType = any, TNotNull extends boolean = boolean, THasDefault extends boolean = boolean> {
  readonly _isColumn: true;
  _tableName: string;
  _propName: string;
  readonly _colName: string;
  readonly _dataType: ColumnDataType;
  readonly _notNull: TNotNull;
  readonly _hasDefault: THasDefault;
  readonly $type: TType;
  primaryKey(): ColumnDef<TType, true, THasDefault>;
  notNull(): ColumnDef<Exclude<TType, null | undefined>, true, THasDefault>;
  unique(): ColumnDef<TType, TNotNull, THasDefault>;
  default(val: any): ColumnDef<TType, TNotNull, true>;
  defaultNow(): ColumnDef<TType, TNotNull, true>;
  references(refFn: () => any, opts?: any): ColumnDef<TType, TNotNull, THasDefault>;
  $typeFn<TCustom>(): ColumnDef<TCustom, TNotNull, THasDefault>;
}

function createColumn<TType, TNotNull extends boolean = false, THasDefault extends boolean = false>(
  colName: string,
  dataType: ColumnDataType,
  notNull: TNotNull = false as TNotNull,
  hasDefault: THasDefault = false as THasDefault
): ColumnDef<TType, TNotNull, THasDefault> {
  const col: any = {
    _isColumn: true as const,
    _tableName: '',
    _propName: '',
    _colName: colName,
    _dataType: dataType,
    _notNull: notNull,
    _hasDefault: hasDefault,
    primaryKey() {
      col._notNull = true;
      return col;
    },
    notNull() {
      col._notNull = true;
      return col;
    },
    unique() {
      return col;
    },
    default(_val: any) {
      col._hasDefault = true;
      return col;
    },
    defaultNow() {
      col._hasDefault = true;
      return col;
    },
    references(_refFn: () => any, _opts?: any) {
      return col;
    },
    $typeFn() {
      return col;
    },
  };
  // Allow col.$type<...>() call syntax if used
  col.$type = () => col;
  return col;
}

export function varchar(name: string, _opts?: { length?: number }) {
  return createColumn<string | null>(name, 'varchar');
}
export function text(name: string) {
  return createColumn<string | null>(name, 'text');
}
export function boolean(name: string) {
  return createColumn<boolean | null>(name, 'boolean');
}
export function integer(name: string) {
  return createColumn<number | null>(name, 'integer');
}
export function numeric(name: string, _opts?: { precision?: number; scale?: number }) {
  return createColumn<string | null>(name, 'numeric');
}
export function timestamp(name: string, _opts?: { withTimezone?: boolean }) {
  return createColumn<Date | null>(name, 'timestamp');
}
export function doublePrecision(name: string) {
  return createColumn<number | null>(name, 'doublePrecision');
}
export function jsonb<T = any>(name: string) {
  const c = createColumn<T | null>(name, 'jsonb');
  return Object.assign(c, {
    $type<TCustom>() {
      return c as unknown as ColumnDef<TCustom | null, false, false>;
    },
  });
}

export function uniqueIndex(_name: string) {
  const builder: any = {
    on: (..._args: any[]) => builder,
    where: (..._args: any[]) => builder,
  };
  return builder;
}

export function index(_name: string) {
  const builder: any = {
    on: (..._args: any[]) => builder,
    where: (..._args: any[]) => builder,
  };
  return builder;
}

export function primaryKey(_opts: { columns: any[] }) {
  return {};
}

export type InferSelectModel<TCols extends Record<string, ColumnDef<any, any, any>>> = {
  [K in keyof TCols]: TCols[K]['_notNull'] extends true
    ? Exclude<TCols[K]['$type'], null | undefined>
    : TCols[K]['$type'] | null;
};

export type InferInsertModel<TCols extends Record<string, ColumnDef<any, any, any>>> = {
  [K in keyof TCols]?: TCols[K]['$type'] | null | SqlExpr<any>;
};

export type PgTableWithColumns<TCols extends Record<string, ColumnDef<any, any, any>>> = {
  readonly _isTable: true;
  readonly _tableName: string;
  readonly _columns: TCols;
  readonly $inferSelect: InferSelectModel<TCols>;
  readonly $inferInsert: InferInsertModel<TCols>;
} & TCols;

export function pgTable<TCols extends Record<string, ColumnDef<any, any, any>>>(
  tableName: string,
  columns: TCols,
  extraConfig?: (self: TCols) => any
): PgTableWithColumns<TCols> {
  for (const [propKey, colDef] of Object.entries(columns)) {
    colDef._tableName = tableName;
    colDef._propName = propKey;
  }
  if (extraConfig) {
    try {
      extraConfig(columns);
    } catch {
      // Ignore index metadata callback errors at definition time
    }
  }
  const tableObj: any = {
    _isTable: true,
    _tableName: tableName,
    _columns: columns,
    ...columns,
  };
  return tableObj;
}

export interface SqlRenderOptions {
  unqualifiedCols?: boolean;
}

export class SqlExpr<T = any> {
  readonly _isSqlExpr = true;
  readonly _phantom!: T;
  constructor(public readonly render: (params: any[], opts?: SqlRenderOptions) => string) {}
  toSql(params: any[], opts?: SqlRenderOptions): string {
    return this.render(params, opts);
  }
}

export function isColumn(val: any): val is ColumnDef<any, any, any> {
  return Boolean(val && typeof val === 'object' && val._isColumn === true);
}

export function isSqlExpr(val: any): val is SqlExpr<any> {
  return Boolean(val && typeof val === 'object' && val._isSqlExpr === true);
}

export function isTable(val: any): val is PgTableWithColumns<any> {
  return Boolean(val && typeof val === 'object' && val._isTable === true);
}

function formatColRef(col: ColumnDef<any, any, any>, opts?: SqlRenderOptions): string {
  if (opts?.unqualifiedCols || !col._tableName) {
    return `"${col._colName}"`;
  }
  return `"${col._tableName}"."${col._colName}"`;
}

function pushParam(params: any[], val: any, colHint?: ColumnDef<any, any, any>): string {
  if (val === undefined) {
    params.push(null);
    return `$${params.length}`;
  }
  if (val !== null && colHint?._dataType === 'jsonb') {
    params.push(typeof val === 'string' ? val : JSON.stringify(val));
    return `$${params.length}::jsonb`;
  }
  if (val instanceof Date) {
    params.push(val.toISOString());
    return `$${params.length}`;
  }
  params.push(val);
  return `$${params.length}`;
}

function renderOperand(operand: any, params: any[], opts?: SqlRenderOptions, colHint?: ColumnDef<any, any, any>): string {
  if (isColumn(operand)) {
    return formatColRef(operand, opts);
  }
  if (isSqlExpr(operand)) {
    return operand.toSql(params, opts);
  }
  if (isTable(operand)) {
    return `"${operand._tableName}"`;
  }
  return pushParam(params, operand, colHint);
}

export function sql<T = any>(strings: TemplateStringsArray, ...values: any[]): SqlExpr<T> {
  return new SqlExpr<T>((params, opts) => {
    let out = '';
    for (let i = 0; i < strings.length; i++) {
      out += strings[i];
      if (i < values.length) {
        const v = values[i];
        out += renderOperand(v, params, opts);
      }
    }
    return out;
  });
}

export function eq(left: any, right: any): SqlExpr<boolean> {
  return new SqlExpr<boolean>((params, opts) => {
    if (right === null) {
      return `${renderOperand(left, params, opts)} IS NULL`;
    }
    const hint = isColumn(left) ? left : undefined;
    return `${renderOperand(left, params, opts)} = ${renderOperand(right, params, opts, hint)}`;
  });
}

export function ne(left: any, right: any): SqlExpr<boolean> {
  return new SqlExpr<boolean>((params, opts) => {
    if (right === null) {
      return `${renderOperand(left, params, opts)} IS NOT NULL`;
    }
    const hint = isColumn(left) ? left : undefined;
    return `${renderOperand(left, params, opts)} <> ${renderOperand(right, params, opts, hint)}`;
  });
}

export function isNull(operand: any): SqlExpr<boolean> {
  return new SqlExpr<boolean>((params, opts) => {
    return `${renderOperand(operand, params, opts)} IS NULL`;
  });
}

export function isNotNull(operand: any): SqlExpr<boolean> {
  return new SqlExpr<boolean>((params, opts) => {
    return `${renderOperand(operand, params, opts)} IS NOT NULL`;
  });
}

export function gt(left: any, right: any): SqlExpr<boolean> {
  return new SqlExpr<boolean>((params, opts) => {
    const hint = isColumn(left) ? left : undefined;
    return `${renderOperand(left, params, opts)} > ${renderOperand(right, params, opts, hint)}`;
  });
}

export function gte(left: any, right: any): SqlExpr<boolean> {
  return new SqlExpr<boolean>((params, opts) => {
    const hint = isColumn(left) ? left : undefined;
    return `${renderOperand(left, params, opts)} >= ${renderOperand(right, params, opts, hint)}`;
  });
}

export function lte(left: any, right: any): SqlExpr<boolean> {
  return new SqlExpr<boolean>((params, opts) => {
    const hint = isColumn(left) ? left : undefined;
    return `${renderOperand(left, params, opts)} <= ${renderOperand(right, params, opts, hint)}`;
  });
}

export function ilike(left: any, right: any): SqlExpr<boolean> {
  return new SqlExpr<boolean>((params, opts) => {
    return `${renderOperand(left, params, opts)} ILIKE ${renderOperand(right, params, opts)}`;
  });
}

export function asc(col: any): SqlExpr<any> {
  return new SqlExpr((params, opts) => `${renderOperand(col, params, opts)} ASC`);
}

export function desc(col: any): SqlExpr<any> {
  return new SqlExpr((params, opts) => `${renderOperand(col, params, opts)} DESC`);
}

export function inArray(col: any, values: any[]): SqlExpr<boolean> {
  return new SqlExpr<boolean>((params, opts) => {
    if (!Array.isArray(values) || values.length === 0) {
      return '1 = 0';
    }
    const hint = isColumn(col) ? col : undefined;
    const placeholders = values.map((v) => renderOperand(v, params, opts, hint)).join(', ');
    return `${renderOperand(col, params, opts)} IN (${placeholders})`;
  });
}

export function notInArray(col: any, values: any[]): SqlExpr<boolean> {
  return new SqlExpr<boolean>((params, opts) => {
    if (!Array.isArray(values) || values.length === 0) {
      return '1 = 1';
    }
    const hint = isColumn(col) ? col : undefined;
    const placeholders = values.map((v) => renderOperand(v, params, opts, hint)).join(', ');
    return `${renderOperand(col, params, opts)} NOT IN (${placeholders})`;
  });
}

export function and(...conditions: (SqlExpr<any> | undefined | null | false)[]): SqlExpr<boolean> {
  const valid = conditions.filter((c): c is SqlExpr<any> => Boolean(c && isSqlExpr(c)));
  return new SqlExpr<boolean>((params, opts) => {
    if (valid.length === 0) return '1 = 1';
    if (valid.length === 1) return valid[0].toSql(params, opts);
    return `(${valid.map((c) => c.toSql(params, opts)).join(' AND ')})`;
  });
}

export function or(...conditions: (SqlExpr<any> | undefined | null | false)[]): SqlExpr<boolean> {
  const valid = conditions.filter((c): c is SqlExpr<any> => Boolean(c && isSqlExpr(c)));
  return new SqlExpr<boolean>((params, opts) => {
    if (valid.length === 0) return '1 = 0';
    if (valid.length === 1) return valid[0].toSql(params, opts);
    return `(${valid.map((c) => c.toSql(params, opts)).join(' OR ')})`;
  });
}

function coerceColumnValue(col: ColumnDef<any, any, any>, rawVal: any): any {
  if (rawVal === null || rawVal === undefined) return null;
  switch (col._dataType) {
    case 'timestamp':
      return rawVal instanceof Date ? rawVal : new Date(rawVal);
    case 'integer':
    case 'doublePrecision':
      return typeof rawVal === 'number' ? rawVal : Number(rawVal);
    case 'boolean':
      return Boolean(rawVal);
    case 'numeric':
      return String(rawVal);
    case 'jsonb':
      if (typeof rawVal === 'string') {
        try {
          return JSON.parse(rawVal);
        } catch {
          return rawVal;
        }
      }
      return rawVal;
    default:
      return rawVal;
  }
}

function mapRowToModel<TCols extends Record<string, ColumnDef<any, any, any>>>(
  table: PgTableWithColumns<TCols>,
  row: Record<string, any>
): InferSelectModel<TCols> {
  const out: any = {};
  for (const [propKey, colDef] of Object.entries(table._columns)) {
    const raw = row[colDef._colName] !== undefined ? row[colDef._colName] : row[propKey];
    out[propKey] = coerceColumnValue(colDef, raw);
  }
  return out;
}

function mapProjectedRow(projection: Record<string, any>, row: Record<string, any>): any {
  const out: any = {};
  for (const [alias, expr] of Object.entries(projection)) {
    const raw = row[alias];
    if (isColumn(expr)) {
      out[alias] = coerceColumnValue(expr, raw);
    } else {
      out[alias] = raw;
    }
  }
  return out;
}

type QueryExecutor = Pick<Pool | PoolClient, 'query'>;

class SelectQueryBuilder<TResult = any> implements PromiseLike<TResult[]> {
  private _table!: PgTableWithColumns<any>;
  private _where?: SqlExpr<any>;
  private _groupBy: any[] = [];
  private _orderBy: any[] = [];
  private _limit?: number;
  private _offset?: number;

  constructor(
    private readonly executor: QueryExecutor,
    private readonly projection?: Record<string, any>
  ) {}

  from<TTable extends PgTableWithColumns<any>>(
    table: TTable
  ): SelectQueryBuilder<this extends SelectQueryBuilder<infer R> ? R : TTable['$inferSelect']> {
    this._table = table;
    return this as any;
  }

  where(cond?: SqlExpr<any>): this {
    this._where = cond;
    return this;
  }

  groupBy(...cols: any[]): this {
    this._groupBy.push(...cols);
    return this;
  }

  orderBy(...orders: any[]): this {
    this._orderBy.push(...orders);
    return this;
  }

  limit(n: number): this {
    this._limit = n;
    return this;
  }

  offset(n: number): this {
    this._offset = n;
    return this;
  }

  private async executeQuery(): Promise<TResult[]> {
    const params: any[] = [];
    let selectClause = '*';
    if (this.projection) {
      const parts: string[] = [];
      for (const [alias, expr] of Object.entries(this.projection)) {
        parts.push(`${renderOperand(expr, params)} AS "${alias}"`);
      }
      selectClause = parts.join(', ');
    }

    let sqlText = `SELECT ${selectClause} FROM "${this._table._tableName}"`;

    if (this._where) {
      const whereSql = this._where.toSql(params);
      if (whereSql && whereSql !== '1 = 1') {
        sqlText += ` WHERE ${whereSql}`;
      }
    }

    if (this._groupBy.length > 0) {
      const groupParts = this._groupBy.map((g) => renderOperand(g, params));
      sqlText += ` GROUP BY ${groupParts.join(', ')}`;
    }

    if (this._orderBy.length > 0) {
      const orderParts = this._orderBy.map((o) =>
        isColumn(o) ? `${formatColRef(o)} ASC` : renderOperand(o, params)
      );
      sqlText += ` ORDER BY ${orderParts.join(', ')}`;
    }

    if (this._limit !== undefined) {
      params.push(this._limit);
      sqlText += ` LIMIT $${params.length}`;
    }

    if (this._offset !== undefined) {
      params.push(this._offset);
      sqlText += ` OFFSET $${params.length}`;
    }

    const res = await this.executor.query(sqlText, params);
    if (this.projection) {
      return res.rows.map((r) => mapProjectedRow(this.projection!, r));
    }
    return res.rows.map((r) => mapRowToModel(this._table, r)) as any;
  }

  then<TResult1 = TResult[], TResult2 = never>(
    onfulfilled?: ((value: TResult[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.executeQuery().then(onfulfilled, onrejected);
  }
}

class InsertQueryBuilder<TTable extends PgTableWithColumns<any>, TReturn = TTable['$inferSelect']>
  implements PromiseLike<TReturn[]>
{
  private _rows: Record<string, any>[] = [];
  private _conflictMode?: 'nothing' | 'update';
  private _conflictTarget?: ColumnDef<any, any, any>[];
  private _conflictSet?: Record<string, any>;
  private _hasReturning = false;
  private _returningProjection?: Record<string, any>;

  constructor(
    private readonly executor: QueryExecutor,
    private readonly table: TTable
  ) {}

  values(rowOrRows: TTable['$inferInsert'] | TTable['$inferInsert'][]): this {
    this._rows = Array.isArray(rowOrRows) ? rowOrRows : [rowOrRows];
    return this;
  }

  onConflictDoNothing(_opts?: { target?: any }): this {
    this._conflictMode = 'nothing';
    return this;
  }

  onConflictDoUpdate(opts: {
    target: ColumnDef<any, any, any> | ColumnDef<any, any, any>[];
    set: Record<string, any>;
  }): this {
    this._conflictMode = 'update';
    this._conflictTarget = Array.isArray(opts.target) ? opts.target : [opts.target];
    this._conflictSet = opts.set;
    return this;
  }

  returning(): InsertQueryBuilder<TTable, TTable['$inferSelect']>;
  returning<TProj extends Record<string, any>>(
    projection: TProj
  ): InsertQueryBuilder<
    TTable,
    { [K in keyof TProj]: TProj[K] extends ColumnDef<infer TCol, any, any> ? Exclude<TCol, null | undefined> : any }
  >;
  returning(projection?: Record<string, any>): any {
    this._hasReturning = true;
    this._returningProjection = projection;
    return this;
  }

  private async executeQuery(): Promise<TReturn[]> {
    if (this._rows.length === 0) return [];

    const propKeys: string[] = [];
    const colDefs: ColumnDef<any, any, any>[] = [];
    for (const [propKey, colDef] of Object.entries(this.table._columns)) {
      const hasAnyDefined = this._rows.some((r) => r[propKey] !== undefined);
      if (hasAnyDefined) {
        propKeys.push(propKey);
        colDefs.push(colDef);
      }
    }

    const params: any[] = [];
    const colNamesSql = colDefs.map((c) => `"${c._colName}"`).join(', ');
    const rowTuplesSql: string[] = [];

    for (const row of this._rows) {
      const valPlaceholders: string[] = [];
      for (let i = 0; i < propKeys.length; i++) {
        const propKey = propKeys[i];
        const colDef = colDefs[i];
        const val = row[propKey];
        if (val === undefined) {
          valPlaceholders.push('DEFAULT');
        } else if (isSqlExpr(val)) {
          valPlaceholders.push(val.toSql(params));
        } else {
          valPlaceholders.push(pushParam(params, val, colDef));
        }
      }
      rowTuplesSql.push(`(${valPlaceholders.join(', ')})`);
    }

    let sqlText = `INSERT INTO "${this.table._tableName}" (${colNamesSql}) VALUES ${rowTuplesSql.join(', ')}`;

    if (this._conflictMode === 'nothing') {
      sqlText += ' ON CONFLICT DO NOTHING';
    } else if (this._conflictMode === 'update' && this._conflictTarget && this._conflictSet) {
      const targetSql = this._conflictTarget.map((c) => `"${c._colName}"`).join(', ');
      const setParts: string[] = [];
      for (const [propKey, val] of Object.entries(this._conflictSet)) {
        if (val === undefined) continue;
        const colDef = this.table._columns[propKey];
        const colName = colDef ? colDef._colName : propKey;
        if (isSqlExpr(val)) {
          setParts.push(`"${colName}" = ${val.toSql(params)}`);
        } else {
          setParts.push(`"${colName}" = ${pushParam(params, val, colDef)}`);
        }
      }
      sqlText += ` ON CONFLICT (${targetSql}) DO UPDATE SET ${setParts.join(', ')}`;
    }

    if (this._hasReturning) {
      if (this._returningProjection) {
        const retParts = Object.entries(this._returningProjection).map(
          ([alias, expr]) => `${renderOperand(expr, params, { unqualifiedCols: true })} AS "${alias}"`
        );
        sqlText += ` RETURNING ${retParts.join(', ')}`;
      } else {
        sqlText += ' RETURNING *';
      }
    }

    const res = await this.executor.query(sqlText, params);
    if (!this._hasReturning) return [] as any;
    if (this._returningProjection) {
      return res.rows.map((r) => mapProjectedRow(this._returningProjection!, r));
    }
    return res.rows.map((r) => mapRowToModel(this.table, r)) as any;
  }

  then<TResult1 = TReturn[], TResult2 = never>(
    onfulfilled?: ((value: TReturn[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.executeQuery().then(onfulfilled, onrejected);
  }
}

class UpdateQueryBuilder<TTable extends PgTableWithColumns<any>, TReturn = TTable['$inferSelect']>
  implements PromiseLike<TReturn[]>
{
  private _setFields: Record<string, any> = {};
  private _where?: SqlExpr<any>;
  private _hasReturning = false;
  private _returningProjection?: Record<string, any>;

  constructor(
    private readonly executor: QueryExecutor,
    private readonly table: TTable
  ) {}

  set(fields: Record<string, any>): this {
    this._setFields = fields;
    return this;
  }

  where(cond?: SqlExpr<any>): this {
    this._where = cond;
    return this;
  }

  returning(): UpdateQueryBuilder<TTable, TTable['$inferSelect']>;
  returning<TProj extends Record<string, any>>(
    projection: TProj
  ): UpdateQueryBuilder<
    TTable,
    { [K in keyof TProj]: TProj[K] extends ColumnDef<infer TCol, any, any> ? Exclude<TCol, null | undefined> : any }
  >;
  returning(projection?: Record<string, any>): any {
    this._hasReturning = true;
    this._returningProjection = projection;
    return this;
  }

  private async executeQuery(): Promise<TReturn[]> {
    const params: any[] = [];
    const setParts: string[] = [];

    for (const [propKey, val] of Object.entries(this._setFields)) {
      if (val === undefined) continue;
      const colDef = this.table._columns[propKey];
      const colName = colDef ? colDef._colName : propKey;
      if (isSqlExpr(val)) {
        setParts.push(`"${colName}" = ${val.toSql(params)}`);
      } else {
        setParts.push(`"${colName}" = ${pushParam(params, val, colDef)}`);
      }
    }

    if (setParts.length === 0) {
      return [];
    }

    let sqlText = `UPDATE "${this.table._tableName}" SET ${setParts.join(', ')}`;

    if (this._where) {
      const whereSql = this._where.toSql(params);
      if (whereSql && whereSql !== '1 = 1') {
        sqlText += ` WHERE ${whereSql}`;
      }
    }

    if (this._hasReturning) {
      if (this._returningProjection) {
        const retParts = Object.entries(this._returningProjection).map(
          ([alias, expr]) => `${renderOperand(expr, params, { unqualifiedCols: true })} AS "${alias}"`
        );
        sqlText += ` RETURNING ${retParts.join(', ')}`;
      } else {
        sqlText += ' RETURNING *';
      }
    }

    const res = await this.executor.query(sqlText, params);
    if (!this._hasReturning) return [] as any;
    if (this._returningProjection) {
      return res.rows.map((r) => mapProjectedRow(this._returningProjection!, r));
    }
    return res.rows.map((r) => mapRowToModel(this.table, r)) as any;
  }

  then<TResult1 = TReturn[], TResult2 = never>(
    onfulfilled?: ((value: TReturn[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.executeQuery().then(onfulfilled, onrejected);
  }
}

class DeleteQueryBuilder<TTable extends PgTableWithColumns<any>, TReturn = TTable['$inferSelect']>
  implements PromiseLike<TReturn[]>
{
  private _where?: SqlExpr<any>;
  private _hasReturning = false;
  private _returningProjection?: Record<string, any>;

  constructor(
    private readonly executor: QueryExecutor,
    private readonly table: TTable
  ) {}

  where(cond?: SqlExpr<any>): this {
    this._where = cond;
    return this;
  }

  returning(): DeleteQueryBuilder<TTable, TTable['$inferSelect']>;
  returning<TProj extends Record<string, any>>(
    projection: TProj
  ): DeleteQueryBuilder<
    TTable,
    { [K in keyof TProj]: TProj[K] extends ColumnDef<infer TCol, any, any> ? Exclude<TCol, null | undefined> : any }
  >;
  returning(projection?: Record<string, any>): any {
    this._hasReturning = true;
    this._returningProjection = projection;
    return this;
  }

  private async executeQuery(): Promise<TReturn[]> {
    const params: any[] = [];
    let sqlText = `DELETE FROM "${this.table._tableName}"`;

    if (this._where) {
      const whereSql = this._where.toSql(params);
      if (whereSql && whereSql !== '1 = 1') {
        sqlText += ` WHERE ${whereSql}`;
      }
    }

    if (this._hasReturning) {
      if (this._returningProjection) {
        const retParts = Object.entries(this._returningProjection).map(
          ([alias, expr]) => `${renderOperand(expr, params, { unqualifiedCols: true })} AS "${alias}"`
        );
        sqlText += ` RETURNING ${retParts.join(', ')}`;
      } else {
        sqlText += ' RETURNING *';
      }
    }

    const res = await this.executor.query(sqlText, params);
    if (!this._hasReturning) return [] as any;
    if (this._returningProjection) {
      return res.rows.map((r) => mapProjectedRow(this._returningProjection!, r));
    }
    return res.rows.map((r) => mapRowToModel(this.table, r)) as any;
  }

  then<TResult1 = TReturn[], TResult2 = never>(
    onfulfilled?: ((value: TReturn[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return this.executeQuery().then(onfulfilled, onrejected);
  }
}

export interface PgDatabase {
  select(): SelectQueryBuilder<any>;
  select<TProj extends Record<string, any>>(
    projection: TProj
  ): SelectQueryBuilder<{
    [K in keyof TProj]: TProj[K] extends ColumnDef<infer TCol, any, any>
      ? Exclude<TCol, null | undefined>
      : TProj[K] extends SqlExpr<infer TSql>
      ? TSql
      : any;
  }>;
  insert<TTable extends PgTableWithColumns<any>>(table: TTable): InsertQueryBuilder<TTable>;
  update<TTable extends PgTableWithColumns<any>>(table: TTable): UpdateQueryBuilder<TTable>;
  delete<TTable extends PgTableWithColumns<any>>(table: TTable): DeleteQueryBuilder<TTable>;
  execute(query: SqlExpr<any> | string): Promise<QueryResult<any>>;
  transaction<T>(fn: (tx: PgDatabase) => Promise<T>): Promise<T>;
}

export function createPgDb(poolOrClient: Pool | PoolClient, isTransactionClient = false): PgDatabase {
  return {
    select(projection?: Record<string, any>): any {
      return new SelectQueryBuilder(poolOrClient, projection);
    },
    insert<TTable extends PgTableWithColumns<any>>(table: TTable) {
      return new InsertQueryBuilder(poolOrClient, table);
    },
    update<TTable extends PgTableWithColumns<any>>(table: TTable) {
      return new UpdateQueryBuilder(poolOrClient, table);
    },
    delete<TTable extends PgTableWithColumns<any>>(table: TTable) {
      return new DeleteQueryBuilder(poolOrClient, table);
    },
    async execute(query: SqlExpr<any> | string) {
      if (typeof query === 'string') {
        return await poolOrClient.query(query);
      }
      const params: any[] = [];
      const sqlText = query.toSql(params);
      return await poolOrClient.query(sqlText, params);
    },
    async transaction<T>(fn: (tx: PgDatabase) => Promise<T>): Promise<T> {
      if (isTransactionClient) {
        return await fn(this);
      }
      const client = await (poolOrClient as Pool).connect();
      try {
        await client.query('BEGIN');
        const txDb = createPgDb(client, true);
        const result = await fn(txDb);
        await client.query('COMMIT');
        return result;
      } catch (err) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // Ignore rollback error
        }
        throw err;
      } finally {
        client.release();
      }
    },
  };
}
