
class TodoParser {
    bulletSymbols: string[] = ["-", "*", "+"];
  
    private lines: string[];
    private withChildren: boolean;
  
    constructor(lines: string[], withChildren: boolean) {
      this.lines = lines;
      this.withChildren = withChildren;
    }
  
    private isTodo(s: string): boolean {
      const r = new RegExp(`\\s*[${this.bulletSymbols.join("")}] \\[[^xX-]\\].*`, "g");
      return r.test(s);
    }
  
    private hasChildren(l: number): boolean {
      if (l + 1 >= this.lines.length) {
        return false;
      }
      const indCurr = this.getIndentation(l);
      const indNext = this.getIndentation(l + 1);
      if (indNext > indCurr) {
        return true;
      }
      return false;
    }
  
    private getChildren(parentLinum: number): string[] {
      const children: string[] = [];
      let nextLinum = parentLinum + 1;
      while (this.isChildOf(parentLinum, nextLinum)) {
        children.push(this.lines[nextLinum]);
        nextLinum++;
      }
      return children;
    }
  
    private isChildOf(parentLinum: number, linum: number): boolean {
      if (parentLinum >= this.lines.length || linum >= this.lines.length) {
        return false;
      }
      return this.getIndentation(linum) > this.getIndentation(parentLinum);
    }
  
    private getIndentation(l: number): number {
      return this.lines[l].search(/\S/);
    }
  
    getTodos(): string[] {
      let todos: string[] = [];
      for (let l = 0; l < this.lines.length; l++) {
        const line = this.lines[l];
        if (this.isTodo(line)) {
          todos.push(line);
          if (this.withChildren && this.hasChildren(l)) {
            const cs = this.getChildren(l);
            todos = [...todos, ...cs];
            l += cs.length;
          }
        }
      }
      return todos;
    }
  }
  
  export const getTodos = ({ lines, withChildren = false }: { lines: string[], withChildren?: boolean }): string[] => {
    const todoParser = new TodoParser(lines, withChildren);
    return todoParser.getTodos();
  };
