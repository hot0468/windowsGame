/**
 * VS 코드 창이 그릴 것 — **연출이고 규칙이 아니다.**
 *
 * ## ⚠️ 수치를 하나도 안 갖는다
 * 보수·업무량·기한은 전부 `data/gigs.ts`가 갖는다(알바몬 공고 → 알바 활동과 같은 방향).
 * 여기 있는 것은 **화면에 뜨는 파일 이름과 코드 몇 줄**뿐이고, 이 값이 바뀌어도 턴·돈·
 * 업무량은 하나도 안 변한다.
 *
 * ## ⚠️ 일감 id로 색인한다
 * 일감마다 다른 파일이 열려야 "다른 일을 하고 있다"가 읽힌다 — 하나로 돌려쓰면 두 일감이
 * 같은 화면이 되어 창을 만든 이유가 사라진다(`TOOL_STEPS`가 도구마다 다른 것과 같은 규칙).
 *
 * ## ⚠️ 실존 코드·실존 회사를 베끼지 않는다
 * 의뢰인은 `data/gigs.ts`가 지어낸 상호이고 코드도 그 일감에 맞춰 지어낸 것이다.
 */

/** 탐색기에 뜨는 파일 하나. */
export interface VsFile {
  name: string
  /** 확장자 색인. 아이콘 글자와 색이 여기서 갈린다. */
  ext: 'ts' | 'tsx' | 'js' | 'html' | 'css' | 'py' | 'md' | 'json'
}

/** 코드 한 줄. 조각마다 색이 갈린다. */
export type CodeSpan = { t: string; c?: 'kw' | 'str' | 'id' | 'com' | 'type' | 'fn' | 'num' }

export interface VsProject {
  /** 탐색기 머리글(=폴더 이름). 대문자로 뜬다. */
  folder: string
  files: VsFile[]
  /** 열려 있는 파일. `files` 중 하나여야 한다(`vscode.test.ts`가 지킨다). */
  open: string
  /** 빵부스러기에 뜰 경로 조각. 파일 이름은 여기 다시 적지 않는다. */
  crumbs: string[]
  code: CodeSpan[][]
}

/** 받아 둔 일이 없을 때. **VS 코드는 폴더 없이도 열린다** — 빈 창을 그리는 것이 맞다. */
export const SCRATCH: VsProject = {
  folder: 'scratch',
  files: [
    { name: 'notes.md', ext: 'md' },
    { name: 'tmp.ts', ext: 'ts' },
  ],
  open: 'tmp.ts',
  crumbs: ['scratch'],
  code: [
    [{ t: '// 받아 둔 일이 없다. 손이 굳지 않게 뭐라도 친다.', c: 'com' }],
    [],
    [
      { t: 'export ', c: 'kw' },
      { t: 'function ', c: 'kw' },
      { t: 'sum', c: 'fn' },
      { t: '(xs: ' },
      { t: 'number', c: 'type' },
      { t: '[]) {' },
    ],
    [
      { t: '  return ', c: 'kw' },
      { t: 'xs.' },
      { t: 'reduce', c: 'fn' },
      { t: '((a, b) => a + b, ' },
      { t: '0', c: 'num' },
      { t: ')' },
    ],
    [{ t: '}' }],
    [],
    [{ t: '// 어제도 이걸 쳤다.', c: 'com' }],
  ],
}

/** 일감 id → 화면. 없는 일감은 `SCRATCH`로 떨어진다. */
export const VS_PROJECTS: Record<string, VsProject> = {
  'web-nulbom': {
    folder: 'nulbom-office',
    files: [
      { name: 'index.html', ext: 'html' },
      { name: 'style.css', ext: 'css' },
      { name: 'main.js', ext: 'js' },
    ],
    open: 'index.html',
    crumbs: ['nulbom-office', 'src'],
    code: [
      [
        { t: '<!doctype ', c: 'kw' },
        { t: 'html', c: 'type' },
        { t: '>' },
      ],
      [
        { t: '<html ', c: 'kw' },
        { t: 'lang', c: 'id' },
        { t: '=' },
        { t: '"ko"', c: 'str' },
        { t: '>' },
      ],
      [
        { t: '  <head>', c: 'kw' },
      ],
      [
        { t: '    <title>', c: 'kw' },
        { t: '늘봄속기사무소' },
        { t: '</title>', c: 'kw' },
      ],
      [
        { t: '    <meta ', c: 'kw' },
        { t: 'name', c: 'id' },
        { t: '=' },
        { t: '"description"', c: 'str' },
        { t: ' />' },
      ],
      [{ t: '  </head>', c: 'kw' }],
      [{ t: '  <body>', c: 'kw' }],
      [
        { t: '    ' },
        { t: '<!-- 대표님이 "깔끔하게"라고만 하셨다 -->', c: 'com' },
      ],
      [
        { t: '    <h1>', c: 'kw' },
        { t: '20년째 받아 적습니다' },
        { t: '</h1>', c: 'kw' },
      ],
      [{ t: '  </body>', c: 'kw' }],
      [{ t: '</html>', c: 'kw' }],
    ],
  },

  'script-cheongram': {
    folder: 'cheongram-classifier',
    files: [
      { name: 'classify.py', ext: 'py' },
      { name: 'rules.py', ext: 'py' },
      { name: 'README.md', ext: 'md' },
    ],
    open: 'classify.py',
    crumbs: ['cheongram-classifier', 'src'],
    code: [
      [
        { t: 'from ', c: 'kw' },
        { t: 'rules ', c: 'id' },
        { t: 'import ', c: 'kw' },
        { t: 'RULES', c: 'type' },
      ],
      [],
      [
        { t: 'def ', c: 'kw' },
        { t: 'classify', c: 'fn' },
        { t: '(path: ' },
        { t: 'str', c: 'type' },
        { t: ') -> ' },
        { t: 'str', c: 'type' },
        { t: ':' },
      ],
      [
        { t: '    ' },
        { t: '# 요구사항이 이번 주에만 세 번 바뀌었다', c: 'com' },
      ],
      [
        { t: '    for ', c: 'kw' },
        { t: 'rule ' },
        { t: 'in ', c: 'kw' },
        { t: 'RULES', c: 'type' },
        { t: ':' },
      ],
      [
        { t: '        if ', c: 'kw' },
        { t: 'rule.' },
        { t: 'matches', c: 'fn' },
        { t: '(path):' },
      ],
      [
        { t: '            return ', c: 'kw' },
        { t: 'rule.folder' },
      ],
      [
        { t: '    return ', c: 'kw' },
        { t: '"미분류"', c: 'str' },
      ],
      [],
      [
        { t: '# TODO: 대표님이 말한 "알아서" 를 정의할 것', c: 'com' },
      ],
    ],
  },
}

export function projectFor(gigId: string | undefined): VsProject {
  return (gigId && VS_PROJECTS[gigId]) || SCRATCH
}
