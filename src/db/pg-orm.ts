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
  if (right === undefined) {
    throw new Error(`ORM Safety: eq() received undefined. Use isNull() or be explicit.`);
  }
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

class SelectQueryBuilder<TResult = any> implements Promise<TResult[]> {
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

  catch<TResult2 = never>(
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult[] | TResult2> {
    return this.executeQuery().catch(onrejected);
  }

  finally(onfinally?: (() => void) | null): Promise<TResult[]> {
    return this.executeQuery().finally(onfinally);
  }

  get [Symbol.toStringTag]() {
    return 'Promise';
  }
}

class InsertQueryBuilder<TTable extends PgTableWithColumns<any>, TReturn = TTable['$inferSelect']>
  implements PromiseLike<TReturn[]>
{
  private _rows: Record<string, any>[] = [];
  private _conflictMode?: 'nothing' | 'update';
  private _conflictTarget?: ColumnDef<any, any, any>[];
  private _conflictSet?: Record<string, any>;
  private _conflictWhere?: SqlExpr<any>;
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
    where?: SqlExpr<any>;
  }): this {
    this._conflictMode = 'update';
    this._conflictTarget = Array.isArray(opts.target) ? opts.target : [opts.target];
    this._conflictSet = opts.set;
    this._conflictWhere = opts.where;
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
      if (this._conflictWhere) {
        sqlText += ` WHERE ${this._conflictWhere.toSql(params)}`;
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

function stripSqlComments(sqlStr: string): string {
  let out = '';
  let inSingle = false;
  let inDouble = false;
  let i = 0;
  while (i < sqlStr.length) {
    const ch = sqlStr[i];
    const next = sqlStr[i + 1];

    if (!inDouble && ch === "'") {
      out += ch;
      if (inSingle && next === "'") {
        out += next;
        i += 2;
        continue;
      }
      inSingle = !inSingle;
      i++;
      continue;
    }

    if (!inSingle && ch === '"') {
      out += ch;
      if (inDouble && next === '"') {
        out += next;
        i += 2;
        continue;
      }
      inDouble = !inDouble;
      i++;
      continue;
    }

    if (!inSingle && !inDouble) {
      if (ch === '-' && next === '-') {
        i += 2;
        while (i < sqlStr.length && sqlStr[i] !== '\n') i++;
        out += ' ';
        continue;
      }
      if (ch === '/' && next === '*') {
        i += 2;
        while (i < sqlStr.length && !(sqlStr[i] === '*' && sqlStr[i + 1] === '/')) i++;
        i += 2;
        out += ' ';
        continue;
      }
    }

    out += ch;
    i++;
  }
  return out;
}

function hasBalancedQuotesAndParens(str: string): boolean {
  let inSingle = false;
  let inDouble = false;
  let depth = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    const next = str[i + 1];
    if (!inDouble && ch === "'") {
      if (inSingle && next === "'") {
        i++;
        continue;
      }
      inSingle = !inSingle;
    } else if (!inSingle && ch === '"') {
      if (inDouble && next === '"') {
        i++;
        continue;
      }
      inDouble = !inDouble;
    } else if (!inSingle && !inDouble) {
      if (ch === '(') depth++;
      else if (ch === ')') {
        depth--;
        if (depth < 0) return false;
      }
    }
  }
  return !inSingle && !inDouble && depth === 0;
}

function unwrapOuterParens(str: string): string {
  let s = str.trim();
  while (s.startsWith('(') && s.endsWith(')')) {
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let matchedOuter = true;
    for (let i = 0; i < s.length - 1; i++) {
      const ch = s[i];
      const next = s[i + 1];
      if (!inDouble && ch === "'") {
        if (inSingle && next === "'") {
          i++;
          continue;
        }
        inSingle = !inSingle;
      } else if (!inSingle && ch === '"') {
        if (inDouble && next === '"') {
          i++;
          continue;
        }
        inDouble = !inDouble;
      } else if (!inSingle && !inDouble) {
        if (ch === '(') depth++;
        else if (ch === ')') {
          depth--;
          if (depth === 0) {
            matchedOuter = false;
            break;
          }
        }
      }
    }
    if (matchedOuter) {
      s = s.slice(1, -1).trim();
    } else {
      break;
    }
  }
  return s;
}

function splitTopLevelLogical(expr: string, keyword: 'OR' | 'AND'): string[] {
  const s = unwrapOuterParens(expr);
  const parts: string[] = [];
  let inSingle = false;
  let inDouble = false;
  let depth = 0;
  let lastIdx = 0;
  const kwLen = keyword.length;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];

    if (!inDouble && ch === "'") {
      if (inSingle && next === "'") {
        i++;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && ch === '"') {
      if (inDouble && next === '"') {
        i++;
        continue;
      }
      inDouble = !inDouble;
      continue;
    }
    if (inSingle || inDouble) continue;

    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      depth--;
      continue;
    }

    if (depth === 0 && s.slice(i, i + kwLen).toUpperCase() === keyword) {
      const prevChar = i > 0 ? s[i - 1] : ' ';
      const nextChar = i + kwLen < s.length ? s[i + kwLen] : ' ';
      const isBoundaryBefore = /[\s)]/.test(prevChar);
      const isBoundaryAfter = /[\s(]/.test(nextChar);
      if (isBoundaryBefore && isBoundaryAfter) {
        parts.push(s.slice(lastIdx, i).trim());
        lastIdx = i + kwLen;
        i += kwLen - 1;
      }
    }
  }

  parts.push(s.slice(lastIdx).trim());
  return parts;
}

function stripPgTypeCasts(operand: string): string {
  return unwrapOuterParens(operand)
    .replace(/::[a-zA-Z_][a-zA-Z0-9_]*(\s*\([^)]*\))?(\[\])?/g, '')
    .trim();
}

const SQL_RESERVED_NON_COLUMN_WORDS = new Set([
  'select',
  'from',
  'where',
  'group',
  'by',
  'having',
  'order',
  'limit',
  'offset',
  'fetch',
  'first',
  'next',
  'row',
  'rows',
  'only',
  'for',
  'update',
  'delete',
  'insert',
  'into',
  'values',
  'set',
  'returning',
  'with',
  'recursive',
  'as',
  'distinct',
  'on',
  'all',
  'union',
  'intersect',
  'except',
  'lateral',
  'table',
  'join',
  'inner',
  'left',
  'right',
  'full',
  'outer',
  'cross',
  'natural',
  'using',
  'window',
  'over',
  'partition',
  'range',
  'groups',
  'preceding',
  'following',
  'unbounded',
  'current',
  'filter',
  'within',
  'asc',
  'desc',
  'nulls',
  'last',
  'true',
  'false',
  'null',
  'unknown',
  'default',
  'not',
  'and',
  'or',
  'is',
  'in',
  'like',
  'ilike',
  'similar',
  'to',
  'escape',
  'between',
  'any',
  'some',
  'exists',
  'case',
  'when',
  'then',
  'else',
  'end',
  'symmetric',
  'asymmetric',
  'isnull',
  'notnull',
  'overlaps',
  'cast',
  'coalesce',
  'nullif',
  'greatest',
  'least',
  'now',
  'current_timestamp',
  'current_date',
  'current_time',
  'localtime',
  'localtimestamp',
  'current_user',
  'session_user',
  'user',
  'current_catalog',
  'current_role',
  'current_schema',
  'today',
  'tomorrow',
  'yesterday',
  'epoch',
  'infinity',
  'nan',
  'interval',
  'extract',
  'array',
  'boolean',
  'bool',
  'integer',
  'int',
  'int2',
  'int4',
  'int8',
  'smallint',
  'bigint',
  'decimal',
  'numeric',
  'real',
  'float',
  'float4',
  'float8',
  'double',
  'precision',
  'varchar',
  'char',
  'character',
  'varying',
  'text',
  'uuid',
  'json',
  'jsonb',
  'date',
  'time',
  'timestamp',
  'timestamptz',
  'timetz',
  'bytea',
  'serial',
  'bigserial',
  'oid',
  'regclass',
  'regtype',
  'void',
  'record',
  'year',
  'years',
  'month',
  'months',
  'day',
  'days',
  'hour',
  'hours',
  'minute',
  'minutes',
  'second',
  'seconds',
  'millisecond',
  'milliseconds',
  'microsecond',
  'microseconds',
  'week',
  'weeks',
  'quarter',
  'decade',
  'century',
  'millennium',
  'dow',
  'doy',
  'isodow',
  'isoyear',
  'timezone',
  'timezone_hour',
  'timezone_minute',
  'lower',
  'upper',
  'trim',
  'btrim',
  'ltrim',
  'rtrim',
  'leading',
  'trailing',
  'both',
  'position',
  'overlay',
  'substring',
  'placing',
  'collation',
  'collate',
  'length',
  'char_length',
  'count',
  'sum',
  'min',
  'max',
  'avg',
  'abs',
  'round',
  'floor',
  'ceil',
  'ceiling',
  'random',
  'ctid',
  'xmin',
  'xmax',
  'cmin',
  'cmax',
  'tableoid',
  '__subquery__',
]);

function isSubqueryClause(raw: string): boolean {
  const s = stripPgTypeCasts(raw);
  if (!s) return false;
  return /^(select|with|values|table)\b/i.test(s);
}

function stripParenthesizedSubqueries(expr: string): { stripped: string; subqueries: string[] } {
  const subqueries: string[] = [];
  let out = '';
  let inSingle = false;
  let inDouble = false;
  let i = 0;

  while (i < expr.length) {
    const ch = expr[i];
    const next = expr[i + 1];

    if (!inDouble && ch === "'") {
      out += ch;
      if (inSingle && next === "'") {
        out += next;
        i += 2;
        continue;
      }
      inSingle = !inSingle;
      i++;
      continue;
    }

    if (!inSingle && ch === '"') {
      out += ch;
      if (inDouble && next === '"') {
        out += next;
        i += 2;
        continue;
      }
      inDouble = !inDouble;
      i++;
      continue;
    }

    if (!inSingle && !inDouble && ch === '(') {
      let depth = 1;
      let j = i + 1;
      let subSingle = false;
      let subDouble = false;
      while (j < expr.length && depth > 0) {
        const c = expr[j];
        const n = expr[j + 1];
        if (!subDouble && c === "'") {
          if (subSingle && n === "'") {
            j += 2;
            continue;
          }
          subSingle = !subSingle;
        } else if (!subSingle && c === '"') {
          if (subDouble && n === '"') {
            j += 2;
            continue;
          }
          subDouble = !subDouble;
        } else if (!subSingle && !subDouble) {
          if (c === '(') depth++;
          else if (c === ')') depth--;
        }
        j++;
      }

      if (depth === 0) {
        const inner = expr.slice(i + 1, j - 1).trim();
        if (isSubqueryClause(inner)) {
          subqueries.push(unwrapOuterParens(inner));
          out += ' __subquery__ ';
        } else {
          const nested = stripParenthesizedSubqueries(inner);
          subqueries.push(...nested.subqueries);
          out += `(${nested.stripped})`;
        }
        i = j;
        continue;
      }
    }

    out += ch;
    i++;
  }

  return { stripped: out, subqueries };
}

function getKnownTableColumns(table?: PgTableWithColumns<any>): {
  tableName?: string;
  columns: Set<string>;
} {
  const columns = new Set<string>();
  if (!table) return { columns };
  const tableName = table._tableName ? table._tableName.toLowerCase() : undefined;
  if (table._columns && typeof table._columns === 'object') {
    for (const [propKey, colDef] of Object.entries(table._columns)) {
      if (propKey) columns.add(propKey.toLowerCase());
      if (colDef && typeof colDef === 'object' && colDef._colName) {
        columns.add(String(colDef._colName).toLowerCase());
      }
    }
  }
  return { tableName, columns };
}

function isValidTargetColumnToken(
  qualifier: string | undefined,
  colName: string,
  table?: PgTableWithColumns<any>,
  requireTableQualifier = false
): boolean {
  const cleanCol = colName.trim().toLowerCase();
  if (!cleanCol || SQL_RESERVED_NON_COLUMN_WORDS.has(cleanCol)) {
    return false;
  }

  const { tableName, columns } = getKnownTableColumns(table);
  const cleanQual = qualifier ? qualifier.trim().toLowerCase() : undefined;

  if (requireTableQualifier) {
    if (!tableName || !cleanQual || cleanQual !== tableName) {
      return false;
    }
  } else if (cleanQual && tableName && cleanQual !== tableName) {
    return false;
  }

  if (columns.size > 0 && !columns.has(cleanCol)) {
    return false;
  }

  return true;
}

function scanOuterColumnReferences(
  expr: string,
  table?: PgTableWithColumns<any>,
  requireTableQualifier = false
): boolean {
  const s = stripPgTypeCasts(expr);
  if (!s) return false;
  if (isSubqueryClause(s) || /^(not\s+)?exists\b/i.test(s)) {
    return false;
  }

  const { stripped } = stripParenthesizedSubqueries(s);

  // Tokenize outside single-quoted string literals
  type Token = { type: 'quoted' | 'unquoted' | 'dot' | 'lparen' | 'other'; value: string };
  const tokens: Token[] = [];
  let i = 0;

  while (i < stripped.length) {
    const ch = stripped[i];
    const next = stripped[i + 1];

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    // Skip single-quoted string literals completely
    if (ch === "'") {
      i++;
      while (i < stripped.length) {
        if (stripped[i] === "'" && stripped[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (stripped[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      tokens.push({ type: 'other', value: "''" });
      continue;
    }

    // Double-quoted identifier
    if (ch === '"') {
      let ident = '';
      i++;
      while (i < stripped.length) {
        if (stripped[i] === '"' && stripped[i + 1] === '"') {
          ident += '"';
          i += 2;
          continue;
        }
        if (stripped[i] === '"') {
          i++;
          break;
        }
        ident += stripped[i];
        i++;
      }
      tokens.push({ type: 'quoted', value: ident });
      continue;
    }

    // Parameter placeholder $1, $2, ...
    if (ch === '$' && /\d/.test(next || '')) {
      i++;
      while (i < stripped.length && /\d/.test(stripped[i])) i++;
      tokens.push({ type: 'other', value: '$param' });
      continue;
    }

    if (ch === '.') {
      tokens.push({ type: 'dot', value: '.' });
      i++;
      continue;
    }

    if (ch === '(') {
      tokens.push({ type: 'lparen', value: '(' });
      i++;
      continue;
    }

    // Unquoted identifier or keyword
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < stripped.length && /[a-zA-Z0-9_]/.test(stripped[i])) {
        ident += stripped[i];
        i++;
      }
      tokens.push({ type: 'unquoted', value: ident });
      continue;
    }

    // Numbers or punctuation
    i++;
    tokens.push({ type: 'other', value: ch });
  }

  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx];
    if (tok.type !== 'quoted' && tok.type !== 'unquoted') continue;

    // Check for qualified identifier: tok . colTok
    if (
      idx + 2 < tokens.length &&
      tokens[idx + 1].type === 'dot' &&
      (tokens[idx + 2].type === 'quoted' || tokens[idx + 2].type === 'unquoted')
    ) {
      const qualTok = tok;
      const colTok = tokens[idx + 2];
      const afterCol = tokens[idx + 3];

      // If followed by '(', it is a schema-qualified function call (e.g. pg_catalog.now()), not a column
      if (afterCol && afterCol.type === 'lparen') {
        idx += 2;
        continue;
      }

      if (isValidTargetColumnToken(qualTok.value, colTok.value, table, requireTableQualifier)) {
        return true;
      }
      idx += 2;
      continue;
    }

    // Standalone identifier: if followed by '(', it is a function call or keyword construct (e.g. EXISTS(...), COALESCE(...))
    const nextTok = tokens[idx + 1];
    if (nextTok && nextTok.type === 'lparen') {
      continue;
    }

    if (isValidTargetColumnToken(undefined, tok.value, table, requireTableQualifier)) {
      return true;
    }
  }

  return false;
}

function containsColumnIdentifier(expr: string, table?: PgTableWithColumns<any>): boolean {
  return scanOuterColumnReferences(expr, table, false);
}

function isDirectColumnReference(expr: string, table?: PgTableWithColumns<any>): boolean {
  const s = stripPgTypeCasts(expr);
  if (!s || isSubqueryClause(s)) return false;
  // Must be solely a quoted or unquoted column reference (optionally table-qualified) with no spaces, parens, or operators
  const qualifiedMatch = s.match(/^(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_]*))\s*\.\s*(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_]*))$/);
  if (qualifiedMatch) {
    const qual = qualifiedMatch[1] || qualifiedMatch[2];
    const col = qualifiedMatch[3] || qualifiedMatch[4];
    return isValidTargetColumnToken(qual, col, table, false);
  }
  const simpleMatch = s.match(/^(?:"([^"]+)"|([a-zA-Z_][a-zA-Z0-9_]*))$/);
  if (simpleMatch) {
    const col = simpleMatch[1] || simpleMatch[2];
    return isValidTargetColumnToken(undefined, col, table, false);
  }
  return false;
}

function parseTopLevelSelectClauses(subquerySql: string): {
  selectList: string;
  fromClause?: string;
  whereClause?: string;
  hasSetOpOrUnsupportedTail: boolean;
} | null {
  const s = unwrapOuterParens(subquerySql).trim();
  if (!/^select\b/i.test(s)) return null;

  let inSingle = false;
  let inDouble = false;
  let depth = 0;

  let fromIdx = -1;
  let whereIdx = -1;
  let tailIdx = -1;

  const tailKeywords = ['GROUP', 'HAVING', 'ORDER', 'LIMIT', 'OFFSET', 'FETCH', 'FOR', 'UNION', 'INTERSECT', 'EXCEPT', 'WINDOW'];
  const setOpKeywords = ['UNION', 'INTERSECT', 'EXCEPT'];
  let hasSetOp = false;

  for (let i = 6; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];

    if (!inDouble && ch === "'") {
      if (inSingle && next === "'") {
        i++;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && ch === '"') {
      if (inDouble && next === '"') {
        i++;
        continue;
      }
      inDouble = !inDouble;
      continue;
    }
    if (inSingle || inDouble) continue;

    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      depth--;
      continue;
    }
    if (depth !== 0) continue;

    const prevChar = i > 0 ? s[i - 1] : ' ';
    if (!/[\s)]/.test(prevChar)) continue;

    if (fromIdx === -1 && s.slice(i, i + 4).toUpperCase() === 'FROM' && /[\s(]/.test(s[i + 4] || ' ')) {
      fromIdx = i;
      i += 3;
      continue;
    }

    if (fromIdx !== -1 && whereIdx === -1 && tailIdx === -1 && s.slice(i, i + 5).toUpperCase() === 'WHERE' && /[\s(]/.test(s[i + 5] || ' ')) {
      whereIdx = i;
      i += 4;
      continue;
    }

    for (const kw of tailKeywords) {
      if (s.slice(i, i + kw.length).toUpperCase() === kw && /[\s(]/.test(s[i + kw.length] || ' ')) {
        if (setOpKeywords.includes(kw)) {
          hasSetOp = true;
        }
        if (tailIdx === -1 && (fromIdx !== -1 || whereIdx !== -1)) {
          tailIdx = i;
        }
        break;
      }
    }
  }

  if (fromIdx === -1) {
    return {
      selectList: s.slice(6).trim(),
      hasSetOpOrUnsupportedTail: hasSetOp,
    };
  }

  const selectList = s.slice(6, fromIdx).trim();
  const fromEnd = whereIdx !== -1 ? whereIdx : tailIdx !== -1 ? tailIdx : s.length;
  const fromClause = s.slice(fromIdx + 4, fromEnd).trim();

  let whereClause: string | undefined;
  if (whereIdx !== -1) {
    const whereEnd = tailIdx !== -1 && tailIdx > whereIdx ? tailIdx : s.length;
    whereClause = s.slice(whereIdx + 5, whereEnd).trim();
  }

  return {
    selectList,
    fromClause,
    whereClause,
    hasSetOpOrUnsupportedTail: hasSetOp,
  };
}

function isSafeSubqueryOperand(
  subquerySql: string,
  params?: any[],
  outerTable?: PgTableWithColumns<any>
): boolean {
  const parsed = parseTopLevelSelectClauses(subquerySql);
  if (!parsed || parsed.hasSetOpOrUnsupportedTail) {
    return false;
  }

  // Subquery must select from a table and must have a non-empty, safe WHERE clause
  if (!parsed.fromClause || !parsed.whereClause) {
    return false;
  }

  if (!parsed.selectList || isTautologicalSelectProjection(parsed.selectList, params)) {
    return false;
  }

  const whereAssessment = assessWhereExpression(parsed.whereClause, params);
  if (whereAssessment !== 'safe') {
    return false;
  }

  return true;
}

function isTautologicalSelectProjection(selectList: string, params?: any[]): boolean {
  const s = unwrapOuterParens(selectList).trim();
  if (!s) return true;
  if (findTopLevelBinaryOp(s) !== null) return true;
  const resolved = resolveScalarOperand(s, params);
  if (resolved.kind === 'constant') return true;
  if (!containsColumnIdentifier(s)) return true;
  return false;
}

function assessExistsSubquery(
  subqueryBody: string,
  params?: any[],
  outerTable?: PgTableWithColumns<any>
): PredicateAssessment {
  // Correlated EXISTS requires knowing the outer target table so correlation can be verified
  if (!outerTable || !outerTable._tableName) {
    return 'constant_unsafe';
  }

  const parsed = parseTopLevelSelectClauses(subqueryBody);
  if (!parsed || parsed.hasSetOpOrUnsupportedTail || !parsed.fromClause || !parsed.whereClause) {
    return 'constant_unsafe';
  }

  // The subquery's WHERE clause must be safe on its own
  const subWhereAssessment = assessWhereExpression(parsed.whereClause, params);
  if (subWhereAssessment !== 'safe') {
    return 'constant_unsafe';
  }

  // And the subquery's WHERE clause must correlate with a table-qualified column of the outer target table
  if (!scanOuterColumnReferences(parsed.whereClause, outerTable, true)) {
    return 'constant_unsafe';
  }

  return 'safe';
}

type ResolvedLiteral =
  | { kind: 'constant'; value: string | number | boolean | null }
  | { kind: 'dynamic' };

function resolveScalarOperand(rawOperand: string, params?: any[]): ResolvedLiteral {
  const s = stripPgTypeCasts(rawOperand);
  if (!s) return { kind: 'constant', value: null };

  const paramMatch = s.match(/^\$(\d+)$/);
  if (paramMatch && params) {
    const idx = Number(paramMatch[1]) - 1;
    if (idx >= 0 && idx < params.length) {
      const val = params[idx];
      if (val === null || val === undefined) return { kind: 'constant', value: null };
      if (typeof val === 'boolean' || typeof val === 'number' || typeof val === 'string') {
        return { kind: 'constant', value: val };
      }
      return { kind: 'constant', value: String(val) };
    }
  }

  const lower = s.toLowerCase();
  if (lower === 'true') return { kind: 'constant', value: true };
  if (lower === 'false') return { kind: 'constant', value: false };
  if (lower === 'null') return { kind: 'constant', value: null };

  if (/^[+-]?\d+(\.\d+)?$/.test(s)) {
    return { kind: 'constant', value: Number(s) };
  }

  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) {
    const inner = s.slice(1, -1);
    if (!inner.includes("'") || /^(?:''|[^'])*$/.test(inner)) {
      return { kind: 'constant', value: inner.replace(/''/g, "'") };
    }
  }

  return { kind: 'dynamic' };
}

type PredicateAssessment = 'safe' | 'tautology' | 'contradiction' | 'constant_unsafe';

function findTopLevelBinaryOp(
  s: string
): { op: string; left: string; right: string } | null {
  let inSingle = false;
  let inDouble = false;
  let depth = 0;

  // Check multi-word comparison operators first at depth 0
  const multiWordOps = [
    'IS NOT DISTINCT FROM',
    'IS DISTINCT FROM',
    'NOT ILIKE',
    'NOT LIKE',
    'ILIKE',
    'LIKE',
  ];

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    const next = s[i + 1];
    if (!inDouble && ch === "'") {
      if (inSingle && next === "'") {
        i++;
        continue;
      }
      inSingle = !inSingle;
      continue;
    }
    if (!inSingle && ch === '"') {
      if (inDouble && next === '"') {
        i++;
        continue;
      }
      inDouble = !inDouble;
      continue;
    }
    if (inSingle || inDouble) continue;
    if (ch === '(') {
      depth++;
      continue;
    }
    if (ch === ')') {
      depth--;
      continue;
    }
    if (depth !== 0) continue;

    for (const mwOp of multiWordOps) {
      if (s.slice(i, i + mwOp.length).toUpperCase() === mwOp) {
        const prev = i > 0 ? s[i - 1] : ' ';
        const after = i + mwOp.length < s.length ? s[i + mwOp.length] : ' ';
        if (/[\s)]/.test(prev) && /[\s(]/.test(after)) {
          return {
            op: mwOp,
            left: s.slice(0, i).trim(),
            right: s.slice(i + mwOp.length).trim(),
          };
        }
      }
    }

    const twoChar = s.slice(i, i + 2);
    if (twoChar === '!=' || twoChar === '<>' || twoChar === '<=' || twoChar === '>=' || twoChar === '~*') {
      return {
        op: twoChar,
        left: s.slice(0, i).trim(),
        right: s.slice(i + 2).trim(),
      };
    }

    if (ch === '=' || ch === '<' || ch === '>' || ch === '~') {
      return {
        op: ch,
        left: s.slice(0, i).trim(),
        right: s.slice(i + 1).trim(),
      };
    }
  }

  return null;
}

function normalizeIdentifierOrExpr(raw: string): string {
  return stripPgTypeCasts(raw).replace(/\s+/g, ' ').trim().toLowerCase();
}

function assessAtomicPredicate(
  raw: string,
  params?: any[],
  table?: PgTableWithColumns<any>
): PredicateAssessment {
  const s = unwrapOuterParens(raw).trim();
  if (!s) return 'tautology';

  // 1. Reject standalone scalar subqueries used directly as predicates: e.g. WHERE (SELECT 1=1), WHERE (SELECT true)
  if (isSubqueryClause(s)) {
    return 'constant_unsafe';
  }

  // 2. Handle EXISTS (...) before general unary NOT
  const existsMatch = s.match(/^exists\s*\(([\s\S]*)\)$/i);
  if (existsMatch) {
    return assessExistsSubquery(existsMatch[1].trim(), params, table);
  }

  // 3. Handle unary NOT (...)
  const notMatch = s.match(/^not(?:\s+|\s*(?=\())([\s\S]+)$/i);
  if (notMatch) {
    const inner = notMatch[1].trim();
    const innerUnwrapped = unwrapOuterParens(inner).trim();
    const innerExistsMatch = innerUnwrapped.match(/^exists\s*\(([\s\S]*)\)$/i);
    if (innerExistsMatch) {
      return assessExistsSubquery(innerExistsMatch[1].trim(), params, table);
    }
    const innerResult = assessWhereExpression(inner, params, table);
    if (innerResult === 'contradiction') return 'tautology';
    if (innerResult === 'tautology') return 'contradiction';
    if (innerResult === 'constant_unsafe') return 'constant_unsafe';
    return containsColumnIdentifier(inner, table) ? 'safe' : 'constant_unsafe';
  }

  // 4. Handle IS [NOT] TRUE / FALSE / NULL / UNKNOWN
  const isMatch = s.match(/^([\s\S]+?)\s+IS\s+(NOT\s+)?(TRUE|FALSE|NULL|UNKNOWN)$/i);
  if (isMatch) {
    const lhs = isMatch[1].trim();
    const isNegated = Boolean(isMatch[2]);
    const rhsKw = isMatch[3].toUpperCase();

    if (isSubqueryClause(lhs) || stripParenthesizedSubqueries(lhs).subqueries.length > 0) {
      return 'constant_unsafe';
    }

    const resolvedLhs = resolveScalarOperand(lhs, params);

    if (resolvedLhs.kind === 'constant') {
      const v = resolvedLhs.value;
      const isNullVal = v === null;
      const isTrueVal = v === true || v === 1 || v === '1' || (typeof v === 'string' && v.toLowerCase() === 'true');
      const isFalseVal = v === false || v === 0 || v === '0' || (typeof v === 'string' && v.toLowerCase() === 'false');

      let matches = false;
      if (rhsKw === 'NULL' || rhsKw === 'UNKNOWN') matches = isNullVal;
      else if (rhsKw === 'TRUE') matches = isTrueVal;
      else if (rhsKw === 'FALSE') matches = isFalseVal;

      const finalTruth = isNegated ? !matches : matches;
      return finalTruth ? 'tautology' : 'contradiction';
    }

    return containsColumnIdentifier(lhs, table) ? 'safe' : 'constant_unsafe';
  }

  // 5. Handle [NOT] IN (...)
  const inMatch = s.match(/^([\s\S]+?)\s+(NOT\s+)?IN\s*\(([\s\S]*)\)$/i);
  if (inMatch) {
    const lhs = inMatch[1].trim();
    const isNotIn = Boolean(inMatch[2]);
    const listBody = inMatch[3].trim();
    if (!listBody) {
      return isNotIn ? 'tautology' : 'contradiction';
    }
    if (!containsColumnIdentifier(lhs, table)) {
      return 'constant_unsafe';
    }
    if (isSubqueryClause(listBody)) {
      return isSafeSubqueryOperand(listBody, params, table) ? 'safe' : 'constant_unsafe';
    }
    const { subqueries } = stripParenthesizedSubqueries(listBody);
    if (subqueries.length > 0) {
      for (const sq of subqueries) {
        if (!isSafeSubqueryOperand(sq, params, table)) {
          return 'constant_unsafe';
        }
      }
    }
    return 'safe';
  }

  // 6. Handle BETWEEN
  const betweenMatch = s.match(/^([\s\S]+?)\s+(NOT\s+)?BETWEEN\s+([\s\S]+?)\s+AND\s+([\s\S]+)$/i);
  if (betweenMatch) {
    const lhs = betweenMatch[1].trim();
    const low = betweenMatch[3].trim();
    const high = betweenMatch[4].trim();
    if (!containsColumnIdentifier(lhs, table)) {
      return 'constant_unsafe';
    }
    if (
      isSubqueryClause(low) ||
      isSubqueryClause(high) ||
      stripParenthesizedSubqueries(low).subqueries.length > 0 ||
      stripParenthesizedSubqueries(high).subqueries.length > 0
    ) {
      return 'constant_unsafe';
    }
    return 'safe';
  }

  // 7. Handle binary comparison operators (=, !=, <>, <, <=, >, >=, LIKE, ILIKE, IS [NOT] DISTINCT FROM)
  const bin = findTopLevelBinaryOp(s);
  if (bin) {
    const { op, left, right } = bin;
    if (!left || !right) return 'constant_unsafe';

    const normLeft = normalizeIdentifierOrExpr(left);
    const normRight = normalizeIdentifierOrExpr(right);

    // Identical left and right expressions (e.g., "id" = "id", 1 = 1, $1 = $1, 'a' = 'a')
    if (normLeft && normLeft === normRight) {
      if (op === '=' || op === '<=' || op === '>=' || op === 'IS NOT DISTINCT FROM' || op === 'LIKE' || op === 'ILIKE') {
        return 'tautology';
      }
      if (op === '!=' || op === '<>' || op === '<' || op === '>' || op === 'IS DISTINCT FROM' || op === 'NOT LIKE' || op === 'NOT ILIKE') {
        return 'contradiction';
      }
    }

    const leftSubqueries = isSubqueryClause(left) ? [unwrapOuterParens(left)] : stripParenthesizedSubqueries(left).subqueries;
    const rightSubqueries = isSubqueryClause(right) ? [unwrapOuterParens(right)] : stripParenthesizedSubqueries(right).subqueries;

    if (leftSubqueries.length > 0 || rightSubqueries.length > 0) {
      // At least one side must contain a genuine outer column reference outside any subquery
      if (!containsColumnIdentifier(left, table) && !containsColumnIdentifier(right, table)) {
        return 'constant_unsafe';
      }
      for (const sq of [...leftSubqueries, ...rightSubqueries]) {
        if (!isSafeSubqueryOperand(sq, params, table)) {
          return 'constant_unsafe';
        }
      }
      return 'safe';
    }

    const resLeft = resolveScalarOperand(left, params);
    const resRight = resolveScalarOperand(right, params);

    // Wildcard LIKE / ILIKE '%'
    if ((op === 'LIKE' || op === 'ILIKE') && resRight.kind === 'constant' && typeof resRight.value === 'string') {
      if (/^%+$/.test(resRight.value)) {
        return 'tautology';
      }
    }

    // Both operands resolve to constants (literals or bound $N parameters with no column references)
    if (resLeft.kind === 'constant' && resRight.kind === 'constant') {
      const lv = resLeft.value;
      const rv = resRight.value;
      if (op === '=' || op === 'IS NOT DISTINCT FROM') {
        return String(lv) === String(rv) ? 'tautology' : 'contradiction';
      }
      if (op === '!=' || op === '<>' || op === 'IS DISTINCT FROM') {
        return String(lv) !== String(rv) ? 'tautology' : 'contradiction';
      }
      if (typeof lv === 'number' && typeof rv === 'number') {
        if (op === '<') return lv < rv ? 'tautology' : 'contradiction';
        if (op === '<=') return lv <= rv ? 'tautology' : 'contradiction';
        if (op === '>') return lv > rv ? 'tautology' : 'contradiction';
        if (op === '>=') return lv >= rv ? 'tautology' : 'contradiction';
      }
      return 'constant_unsafe';
    }

    // At least one side of a binary comparison in UPDATE/DELETE WHERE must reference a genuine outer column
    if (!containsColumnIdentifier(left, table) && !containsColumnIdentifier(right, table)) {
      return 'constant_unsafe';
    }

    return 'safe';
  }

  // 8. Standalone scalar/literal/parameter without comparison operator
  const resolvedStandalone = resolveScalarOperand(s, params);
  if (resolvedStandalone.kind === 'constant') {
    const v = resolvedStandalone.value;
    if (
      v === true ||
      v === 1 ||
      v === '1' ||
      (typeof v === 'number' && v !== 0) ||
      (typeof v === 'string' && ['true', 't', 'yes', 'on', '1'].includes(v.toLowerCase()))
    ) {
      return 'tautology';
    }
    if (
      v === false ||
      v === 0 ||
      v === '0' ||
      v === null ||
      (typeof v === 'string' && ['false', 'f', 'no', 'off', '0', ''].includes(v.toLowerCase()))
    ) {
      return 'contradiction';
    }
    return 'constant_unsafe';
  }

  // 9. Fail closed on any remaining unrecognized/complex expression unless it is a direct boolean column reference
  if (!isDirectColumnReference(s, table)) {
    return 'constant_unsafe';
  }

  return 'safe';
}

function areComplementaryDisjuncts(a: string, b: string): boolean {
  const ua = unwrapOuterParens(a).trim();
  const ub = unwrapOuterParens(b).trim();

  // X OR NOT X
  const notA = ua.match(/^not(?:\s+|\s*(?=\())([\s\S]+)$/i);
  if (notA && normalizeIdentifierOrExpr(notA[1]) === normalizeIdentifierOrExpr(ub)) {
    return true;
  }
  const notB = ub.match(/^not(?:\s+|\s*(?=\())([\s\S]+)$/i);
  if (notB && normalizeIdentifierOrExpr(notB[1]) === normalizeIdentifierOrExpr(ua)) {
    return true;
  }

  // X IS NULL OR X IS NOT NULL
  const nullA = ua.match(/^([\s\S]+?)\s+IS\s+(NOT\s+)?NULL$/i);
  const nullB = ub.match(/^([\s\S]+?)\s+IS\s+(NOT\s+)?NULL$/i);
  if (
    nullA &&
    nullB &&
    Boolean(nullA[2]) !== Boolean(nullB[2]) &&
    normalizeIdentifierOrExpr(nullA[1]) === normalizeIdentifierOrExpr(nullB[1])
  ) {
    return true;
  }

  // X = Y OR X <> Y / X != Y
  const binA = findTopLevelBinaryOp(ua);
  const binB = findTopLevelBinaryOp(ub);
  if (binA && binB) {
    const sameOperands =
      (normalizeIdentifierOrExpr(binA.left) === normalizeIdentifierOrExpr(binB.left) &&
        normalizeIdentifierOrExpr(binA.right) === normalizeIdentifierOrExpr(binB.right)) ||
      (normalizeIdentifierOrExpr(binA.left) === normalizeIdentifierOrExpr(binB.right) &&
        normalizeIdentifierOrExpr(binA.right) === normalizeIdentifierOrExpr(binB.left));
    if (sameOperands) {
      const isEqA = binA.op === '=';
      const isNeqA = binA.op === '!=' || binA.op === '<>';
      const isEqB = binB.op === '=';
      const isNeqB = binB.op === '!=' || binB.op === '<>';
      if ((isEqA && isNeqB) || (isNeqA && isEqB)) {
        return true;
      }
    }
  }

  return false;
}

function assessWhereExpression(
  rawExpr: string,
  params?: any[],
  table?: PgTableWithColumns<any>
): PredicateAssessment {
  const cleaned = unwrapOuterParens(rawExpr).trim();
  if (!cleaned) return 'tautology';

  // Reject standalone subquery before logical splitting so SELECT ... WHERE ... AND/OR ... is not split as outer AND/OR
  if (isSubqueryClause(cleaned)) {
    return 'constant_unsafe';
  }

  // 1. Decompose top-level OR branches
  const orBranches = splitTopLevelLogical(cleaned, 'OR');
  if (orBranches.length > 1) {
    for (const branch of orBranches) {
      if (!branch) return 'tautology';
      const branchResult = assessWhereExpression(branch, params, table);
      if (branchResult === 'tautology' || branchResult === 'constant_unsafe') {
        return 'tautology';
      }
    }
    // Check complementary disjuncts (e.g., col = $1 OR col <> $1, col IS NULL OR col IS NOT NULL)
    for (let i = 0; i < orBranches.length; i++) {
      for (let j = i + 1; j < orBranches.length; j++) {
        if (areComplementaryDisjuncts(orBranches[i], orBranches[j])) {
          return 'tautology';
        }
      }
    }
    return 'safe';
  }

  // 2. Decompose top-level AND branches
  const andBranches = splitTopLevelLogical(cleaned, 'AND');
  if (andBranches.length > 1) {
    let hasSafeColumnFilter = false;
    for (const branch of andBranches) {
      if (!branch) return 'tautology';
      // If any AND branch itself contains a compound OR tautology, block it
      const subOrs = splitTopLevelLogical(branch, 'OR');
      if (subOrs.length > 1) {
        const subAssessment = assessWhereExpression(branch, params, table);
        if (subAssessment === 'tautology' || subAssessment === 'constant_unsafe') {
          return 'tautology';
        }
      }
      const branchResult = assessWhereExpression(branch, params, table);
      if (branchResult === 'safe') {
        hasSafeColumnFilter = true;
      }
    }
    return hasSafeColumnFilter ? 'safe' : 'tautology';
  }

  // 3. Atomic predicate
  return assessAtomicPredicate(cleaned, params, table);
}

function assertSafeWhereClause(
  whereSql: string,
  operation: 'UPDATE' | 'DELETE',
  params?: any[],
  table?: PgTableWithColumns<any>
): void {
  if (!whereSql || !whereSql.trim()) {
    throw new Error(`ORM Safety: ${operation} query has empty .where().`);
  }

  const stripped = stripSqlComments(whereSql).trim();
  if (!stripped) {
    throw new Error(`ORM Safety: ${operation} query has empty .where().`);
  }

  if (!hasBalancedQuotesAndParens(stripped)) {
    throw new Error(`ORM Safety: ${operation} query has malformed quotes or unbalanced parentheses in .where().`);
  }

  const topOrBranches = isSubqueryClause(stripped) ? [stripped] : splitTopLevelLogical(stripped, 'OR');
  const assessment = assessWhereExpression(stripped, params, table);

  if (assessment === 'tautology' || assessment === 'constant_unsafe') {
    if (topOrBranches.length > 1) {
      throw new Error(
        `ORM Safety: ${operation} query has unrestricted compound .where() containing OR tautology. Execution blocked.`
      );
    }
    throw new Error(
      `ORM Safety: ${operation} query has unrestricted .where() (tautological or constant condition). Execution blocked.`
    );
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

    if (!this._where) {
      throw new Error(`ORM Safety: UPDATE query missing .where(). Use .where(sql\`1=1\`) if intentional.`);
    }

    if (this._where) {
      const whereSql = this._where.toSql(params);
      assertSafeWhereClause(whereSql, 'UPDATE', params, this.table);
      sqlText += ` WHERE ${whereSql}`;
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

    if (!this._where) {
      throw new Error(`ORM Safety: DELETE query missing .where(). Use .where(sql\`1=1\`) if intentional.`);
    }

    if (this._where) {
      const whereSql = this._where.toSql(params);
      assertSafeWhereClause(whereSql, 'DELETE', params, this.table);
      sqlText += ` WHERE ${whereSql}`;
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
