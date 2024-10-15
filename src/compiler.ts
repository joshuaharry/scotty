import fs from "fs";
import path from "path";
import {parse, ParserPlugin} from "@babel/parser";
import * as t from "@babel/types";
import generate from "@babel/generator";
import template from "@babel/template";
import prettier from "prettier";

// Util {{{
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const readTypesFromFile = (name: string): string =>
  fs.readFileSync(path.join(process.cwd(), name), "utf-8");

let classDeclarations = new Map();

function classContractTypeName(name: string): string {
   return name + "$Class";
}

function instanceContractTypeName(name: string): string {
   return name + "$Instance";
}

interface CompilerInput {
  code: string;
  language: ParserPlugin;
}

const getAst = (input: CompilerInput): t.File =>
  parse(input.code, {
    plugins: [input.language],
    sourceType: "module",
  });

const getCode = (ast: t.File): string =>
  prettier.format(generate(ast).code, {parser: "babel"});

interface GraphNode {
  name: string;
  dependencies: string[];
  isRecursive: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [otherProperty: string]: any;
}

type Graph = Record<string, GraphNode>;

const isBackwardsReference = (nodes: GraphNode[], node: GraphNode) =>
  node.dependencies.some((dep) => !nodes.find((aNode) => aNode.name === dep));

export const markGraphNodes = (graph: Graph): GraphNode[] =>
  Object.values(graph).reduce(
    (nodes: GraphNode[], node) =>
      nodes.concat(
        isBackwardsReference(nodes, node)
          ? {...node, isRecursive: true}
          : node
      ),
    []
  );

const getTypeName = (curType: t.TSEntityName | t.Identifier): string => {
  if (curType.type === "Identifier") return curType.name;
  const {left, right} = curType;
  return `${getTypeName(left)}.${right.name}`;
};

const isLiteralObject = (literal: t.TSTypeLiteral): boolean => {
  return literal.members.every(
    (member) =>
      member.type === "TSIndexSignature" ||
      member.type === "TSPropertySignature"
  );
};

const addIndexSignature = (
  acc: ObjectRecord,
  el: t.TSIndexSignature
): ObjectRecord => {
  const {name} = el.parameters[0];
  const type = el.typeAnnotation?.typeAnnotation || t.tsAnyKeyword();
  return {...acc, [name]: {type, isIndex: true, isOptional: false}};
};

const addPropertySignature = (
  acc: ObjectRecord,
  el: t.TSPropertySignature
): ObjectRecord => {
  if (el.key.type !== "Identifier") return acc;
  const type = el?.typeAnnotation?.typeAnnotation;
  if (!type) return acc;
  return {
    ...acc,
    [el.key.name]: {type, isOptional: Boolean(el.optional), isIndex: false},
  };
};

const makeObjectLiteral = (lit: t.TSTypeLiteral): ObjectRecord => {
  const object: ObjectRecord = lit.members.reduce((acc, el) => {
    if (el.type === "TSIndexSignature") return addIndexSignature(acc, el);
    if (el.type === "TSPropertySignature") return addPropertySignature(acc, el);
    return acc;
  }, {});
  return object;
};

const toFlowObject = (
  acc: FlowObjectRecord,
  el: t.ObjectTypeProperty | t.ObjectTypeSpreadProperty
): FlowObjectRecord => {
  if (el.type === "ObjectTypeSpreadProperty") return acc;
  if (el.key.type !== "Identifier") return acc;
  return {...acc, [el.key.name]: {type: el.value}};
};

const makeFlowObjectLiteral = (
  types: Array<t.ObjectTypeProperty | t.ObjectTypeSpreadProperty>
): FlowObjectSyntax => {
  return {types: types.reduce(toFlowObject, {})};
};

const extractFlowModuleName = (el: t.DeclareModuleExports): string | null => {
  const {
    typeAnnotation: {typeAnnotation},
  } = el;
  if (
    typeAnnotation.type === "GenericTypeAnnotation" &&
    typeAnnotation?.id?.type === "Identifier"
  ) {
    return typeAnnotation.id.name;
  }
  if (el.type === "DeclareModuleExports") {
    el.typeAnnotation;
  }
  return null;
};

const markExports = (l: ContractToken[]): ContractToken[] => {
  const theExports = l.filter((token) => token.typeToMark !== null);
  const theTypes = l.filter((token) => token.typeToMark === null);
  return theTypes.map((type) => {
    return theExports.some((exp) => exp.typeToMark === type.name)
      ? {...type, isMainExport: true}
      : type;
  });
};
// }}}

// same as TSFunctionType but with a self type
interface TSMethodType extends t.TSFunctionType {
    self: t.TSType | null;
}

// Map the AST into Contract Tokens {{{
interface FunctionParameter {
  type: t.TSType;
  isRestParameter: boolean;
  isOptional: boolean;
}

interface FunctionSyntax {
  domain: FunctionParameter[];
  range: t.TSType;
  self: t.TSType | null;
}

interface ClassSyntax {
  domain: FunctionParameter[];
  self: t.TSType;
}

interface ObjectChunk {
  type: t.TSType;
  isOptional: boolean;
  isIndex: boolean;
}

type ObjectRecord = Record<string, ObjectChunk>;

interface ObjectSyntax {
  types: ObjectRecord;
  isRecursive: boolean;
  prototypes?: ObjectRecord;
  clazz?: string;
}

interface FlatTypescriptType {
  hint: "flat";
  syntax: t.TSType;
}

interface ObjectTypescriptType {
  hint: "object";
  syntax: ObjectSyntax;
}

interface FunctionTypescriptType {
  hint: "function";
  syntax: FunctionSyntax;
}

interface ClassTypescriptType {
  hint: "class";
  syntax: ClassSyntax;
}

type TypescriptType =
  | FlatTypescriptType
  | ObjectTypescriptType
  | FunctionTypescriptType
  | ClassTypescriptType;

type FlowObjectRecord = Record<string, {type: t.FlowType}>;

interface FlowObjectSyntax {
  types: FlowObjectRecord;
}

interface ObjectFlowType {
  hint: "flowObject";
  syntax: FlowObjectSyntax;
}

type FlowType = ObjectFlowType;

interface ContractToken {
  name: string;
  typeToMark: string | null;
  type: TypescriptType | FlowType | null;
  isSubExport: boolean;
  isMainExport: boolean;
  existsInJs: boolean;
}

type ParameterChild =
  | t.Identifier
  | t.RestElement
  | t.TSParameterProperty
  | t.Pattern;

const getParameterType = (el: ParameterChild): t.TSType =>
  el.type !== "TSParameterProperty" &&
    el?.typeAnnotation?.type === "TSTypeAnnotation"
    ? el.typeAnnotation.typeAnnotation
    : t.tsAnyKeyword();

const getParameterTypes = (els: ParameterChild[]): FunctionParameter[] =>
  els.map((el) => {
    return {
      type: getParameterType(el),
      isRestParameter: el.type === "RestElement",
      isOptional: Boolean(el.type === "Identifier" && el.optional),
    };
  });

const implicitCtorTypes = (): FunctionParameter[] =>
  // implicit class contructor range
  [{
    type: t.tsAnyKeyword(),
    isRestParameter: true,
    isOptional: true,
  }];

type InterfaceChild =
  | t.TSPropertySignature
  | t.TSIndexSignature
  | t.TSCallSignatureDeclaration
  | t.TSConstructSignatureDeclaration
  | t.TSMethodSignature;

type ClassChild =
  | t.TSIndexSignature
  | t.ClassMethod
  | t.ClassPrivateMethod
  | t.ClassPrivateProperty
  | t.ClassProperty
  | t.TSDeclareMethod;

const accumulateType = (
  acc: ObjectRecord,
  el: t.TSPropertySignature | t.TSMethodSignature | t.ClassProperty | t.ClassMethod,
  type?: t.TSType
): ObjectRecord => {
  if (!type || el?.key?.type !== "Identifier") return acc;
  const {name} = el.key;
  return {
    ...acc,
    [name]: {type, isIndex: false, isOptional: Boolean(el.optional)},
  };
};

const coerceMethodSignature = (el: t.TSMethodSignature): t.TSFunctionType => ({
  type: "TSFunctionType",
  typeAnnotation: el.typeAnnotation,
  parameters: el.parameters,
  leadingComments: null,
  innerComments: null,
  trailingComments: null,
  loc: null,
  start: null,
  end: null,
});

type ParamChild = t.Identifier 
   | t.RestElement;

let G: number = 0;

function gensym(base = "g"): string {
   return base + G++;
}

function coerceParam(el: ParameterChild): t.Identifier {

  function genIdentifier() {
    return <t.Identifier>{
      type: "Identifier",
      leadingComments: null,
      innerComments: null,
      trailingComments: null,
      loc: null,
      start: null,
      end: null,
      name: gensym()
    }
  }

  function coerceAssignmentPattern(el: t.AssignmentPattern): t.Identifier {
    return genIdentifier();
  }

  switch (el.type) {
    case "Identifier":
      return el;

    case "RestElement":
      return genIdentifier();

    case "TSParameterProperty":
       if (el.parameter.type === "AssignmentPattern") {
         return coerceAssignmentPattern(el.parameter);
       } else {
         if (el.parameter.type === "Identifier") {
            return el.parameter;
         } else {
            return coerceAssignmentPattern(el.parameter);
         }
       }

    case "AssignmentPattern":
      return coerceAssignmentPattern(el);

    default: 
      return genIdentifier();
  }
}

function typeReference(name: string): t.TSType {
   const entityName = <t.Identifier>{
      type: "Identifier",
      leadingComments: null,
      innerComments: null,
      trailingComments: null,
      loc: null,
      start: null,
      end: null,
      name: name
    };
   return {
     type: "TSTypeReference",
     typeName: entityName,
     leadingComments: null,
     innerComments: null,
     trailingComments: null,
     loc: null,
     start: null,
     end: null
  };
}

function ctorTypeAnnotation(el: any): t.TSTypeAnnotation {
   if (el === null) {
      return {
     	 type: "TSTypeAnnotation",
     	 typeAnnotation: typeReference("object"),
     	 leadingComments: null,
     	 innerComments: null,
     	 trailingComments: null,
     	 loc: null,
     	 start: null,
     	 end: null
      }
   } else {
      return {
     	 type: "TSTypeAnnotation",
     	 typeAnnotation: typeReference(instanceContractTypeName(el.id.name)),
     	 leadingComments: null,
     	 innerComments: null,
     	 trailingComments: null,
     	 loc: null,
     	 start: null,
     	 end: null
      }
   }
}

const coerceClassMethod = (el: t.ClassMethod, parent: any): TSMethodType => ({
  type: "TSFunctionType",
  self: (el.kind !== "constructor" ? typeReference(instanceContractTypeName(parent.id.name)) : null),
  typeAnnotation: (el.kind === "constructor" 
     ? ctorTypeAnnotation(parent)
     : (el.returnType?.type === "TSTypeAnnotation"
        ? el.returnType 
        : null)),
  parameters: el.params.map(coerceParam),
  leadingComments: null,
  innerComments: null,
  trailingComments: null,
  loc: null,
  start: null,
  end: null,
});

type InterfaceChildMapper = Record<
  string,
  (acc: ObjectRecord, el: any, parent: any) => ObjectRecord
>;

const childMappers: InterfaceChildMapper = {
  TSPropertySignature(acc, el: t.TSPropertySignature, parent: any) {
    const type = el?.typeAnnotation?.typeAnnotation;
    return accumulateType(acc, el, type);
  },
  ClassProperty(acc, el: t.ClassProperty, parent: any) {
    if (el?.typeAnnotation?.type === "TSTypeAnnotation") {
      const type = el?.typeAnnotation?.typeAnnotation;
      return accumulateType(acc, el, type);
    } else {
       return acc;
    }
  },
  ClassMethod(acc, el: t.ClassMethod, parent: any) {
    return accumulateType(acc, el, coerceClassMethod(el, parent));
  },
  TSMethodSignature(acc, el: t.TSMethodSignature, parent: any) {
    return accumulateType(acc, el, coerceMethodSignature(el));
  },
  TSDeclareMethod(acc, el: t.ClassMethod, parent: any) {
    return accumulateType(acc, el, coerceClassMethod(el, parent));
  },
};

const returnObjectRecord = (acc: ObjectRecord, _: any, parent: any) => acc;

const getObjectPropTypes = (els: InterfaceChild[]): ObjectRecord => {
  return els.reduce((acc: ObjectRecord, el) => {
    const fn = childMappers[el.type] || returnObjectRecord;
    return fn(acc, el, null);
  }, {});
};

const getClassPropTypes = (els: ClassChild[], parent: any): ObjectRecord => {
  return els.reduce((acc: ObjectRecord, el) => {
    if (el.type === "TSDeclareMethod") {
       // methods are not instances property, skip them
       return acc;
    } else {
       const fn = childMappers[el.type] || returnObjectRecord;
       return fn(acc, el, parent);
    }
  }, {});
};

const getClassMetTypes = (els: ClassChild[], parent: any): ObjectRecord => {
  return els.reduce((acc: ObjectRecord, el) => {
    if (el.type === "TSDeclareMethod") {
       if (el.kind === "constructor") {
          // skip the constructor
          return acc;
       } else {
          const fn = childMappers[el.type] || returnObjectRecord;
          return fn(acc, el, parent);
       }
    } else {
      return acc;
    }
  }, {});
};

const typeContainsName = (name: string, chunk: ObjectChunk) => {
  const loop = (type: t.TSType): boolean => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const loopMap: Record<string, (type: any) => boolean> = {
      TSTypeReference(type: t.TSTypeReference) {
        const typeName = getTypeName(type.typeName);
        return typeName === name;
      },
      TSFunctionType(type: t.TSFunctionType) {
        const {typeAnnotation} = type;
        if (typeAnnotation && loop(typeAnnotation.typeAnnotation)) return true;
        return false;
      },
      TSArrayType(type: t.TSArrayType) {
        return loop(type.elementType);
      },
      TSReadonlyArrayType(type: t.TSArrayType) {
        return loop(type.elementType);
      },
      TSParenthesizedType(type: t.TSParenthesizedType) {
        return loop(type.typeAnnotation);
      },
      TSUnionType(type: t.TSUnionType) {
        return type.types.some((type) => loop(type) === true);
      },
    };
    const fn = loopMap[type?.type];
    return fn ? fn(type) : false;
  };
  return loop(chunk.type);
};

const isRecursiveChunk = (name: string, entry: [string, ObjectChunk]) => {
  const [typeName, typeIdentifier] = entry;
  return typeName === name || typeContainsName(name, typeIdentifier);
};

const checkRecursive = (name: string, types: ObjectRecord): boolean => {
  return Object.entries(types).some((entry) => isRecursiveChunk(name, entry));
};

const getTypeToken = (name: string, type: t.TSType): TypescriptType => {
  if (type.type !== "TSTypeLiteral") return {hint: "flat", syntax: type};
  if (!isLiteralObject(type)) return {hint: "flat", syntax: type};
  const types = makeObjectLiteral(type);
  return {
    hint: "object",
    syntax: {types, isRecursive: checkRecursive(name, types)},
  };
};

const getFlowTypeToken = (_: string, type: t.FlowType): FlowType => {
  if (type.type === "ObjectTypeAnnotation")
    return {
      hint: "flowObject",
      syntax: makeFlowObjectLiteral(type.properties),
    };
  throw new Error("UNHANDLED FLOW TYPE");
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TokenHandler = (el: any) => ContractToken[];

const tokenMap: Record<string, TokenHandler> = {
  File(el: t.File): ContractToken[] {
    // @ts-ignore
    return reduceTokens(el.program.body);
  },
  DeclareModule(el: t.DeclareModule) {
    return reduceTokens(el.body.body);
  },
  DeclareModuleExports(el: t.DeclareModuleExports) {
    const typeToMark = extractFlowModuleName(el);
    if (typeToMark !== null) {
      return [
        {
          name: "NONE",
          type: null,
          isSubExport: false,
          isMainExport: false,
          existsInJs: false,
          typeToMark,
        },
      ];
    }
    return [
      {
        name: "packageExport",
        type: getFlowTypeToken("", el.typeAnnotation.typeAnnotation),
        isSubExport: false,
        isMainExport: true,
        existsInJs: false,
        typeToMark: null,
      },
    ];
  },
  DeclareTypeAlias(el: t.DeclareTypeAlias) {
    return [
      {
        name: el.id.name,
        typeToMark: null,
        type: getFlowTypeToken(el.id.name, el.right),
        isSubExport: false,
        isMainExport: false,
        existsInJs: true,
      },
    ];
  },
  TSTypeAliasDeclaration(el: t.TSTypeAliasDeclaration) {
    const {name} = el.id;
    const typeAnnotation = el.typeAnnotation;
    if (!t.isTSType(typeAnnotation)) return [];
    const type = typeAnnotation as t.TSType;
    return [
      {
        name,
        type: getTypeToken(name, type),
        typeToMark: null,
        isSubExport: false,
        isMainExport: false,
        existsInJs: false,
      },
    ];
  },
  TSExportAssignment(el: t.TSExportAssignment) {
    if (el.expression.type !== "Identifier") return [];
    const {name} = el.expression;
    return [
      {
        name,
        typeToMark: null,
        type: null,
        isSubExport: false,
        isMainExport: true,
        existsInJs: true,
      },
    ];
  },
  TSModuleBlock(el: t.TSModuleBlock) {
    return reduceTokens(el.body);
  },
  TSModuleDeclaration(el: t.TSModuleDeclaration) {
    const tokens = getContractTokens(el.body);
    if (el.id.type !== "Identifier") return [];
    const {name} = el.id;
    return tokens.map((token) => ({...token, name: `${name}.${token.name}`}));
  },
  TSInterfaceDeclaration(el: t.TSInterfaceDeclaration) {
    if (el.extends) console.log("Warning:", el.id.name, "has extension");
    const name = el.id.name;
    const {body} = el.body;
    const types = getObjectPropTypes(body);
    return [
      {
        name,
        type: {
          hint: "object",
          syntax: {types, isRecursive: checkRecursive(name, types)},
        },
        typeToMark: null,
        isSubExport: false,
        isMainExport: false,
        existsInJs: false,
      },
    ];
  },
  TSDeclareFunction(el: t.TSDeclareFunction) {
    const name = el.id?.name;
    if (!name) return [];
    if (el?.returnType?.type !== "TSTypeAnnotation") return [];
    const syntax: FunctionSyntax = {
      self: null,
      range: el.returnType.typeAnnotation,
      domain: getParameterTypes(el.params),
    };
    return [
      {
        name,
        typeToMark: null,
        type: {hint: "function", syntax},
        isSubExport: false,
        isMainExport: false,
        existsInJs: true,
      },
    ];
  },
  ExportNamedDeclaration(el: t.ExportNamedDeclaration) {
    if (!el.declaration) return [];
    const tokens = getContractTokens(el.declaration);
    if (tokens.length === 0) return [];
    return tokens.map(statement => ({...statement, isSubExport: statement.existsInJs}));
  },
  ExportDefaultDeclaration(el: t.ExportDefaultDeclaration) {
    if (el.declaration.type !== 'Identifier') return [];
    return [{type: null, existsInJs: true, isSubExport: false, isMainExport: true, name: el.declaration.name, typeToMark: null}];
  },
  VariableDeclaration(el: t.VariableDeclaration) {
    if (el.declarations.length !== 1) return [];
    const declaration = el.declarations[0];
    return getContractTokens(declaration);
  },
  VariableDeclarator(el: t.VariableDeclarator) {
    if (el.id.type !== "Identifier") return [];
    return getContractTokens(el.id);
  },
  Identifier(el: t.Identifier) {
    const {name} = el;
    if (el?.typeAnnotation?.type !== "TSTypeAnnotation") return [];
    const syntax = el.typeAnnotation.typeAnnotation;
    return [
      {
        name,
        typeToMark: null,
        type: getTypeToken(name, syntax),
        isSubExport: false,
        isMainExport: false,
        existsInJs: true,
      },
    ];
  },
  ClassDeclaration(el: t.ClassDeclaration) {
    const name = el.id.name;
    const className = classContractTypeName(name);
    const instanceName = instanceContractTypeName(name);
    const {body} = el.body;
    const types = getClassPropTypes(body, el);
    const prototypes = getClassMetTypes(body, el);
    const ctor = <t.ClassMethod>body.find(el => el.type === "TSDeclareMethod" && el.kind === "constructor");
    classDeclarations.set(name, el);
    return [
      // the class
      {
        name: instanceName,
        typeToMark: null,
        type: {
           hint: "object",
           syntax: {types, prototypes, isRecursive: true, clazz: name},
        },
        isSubExport: false,
        isMainExport: false,
        existsInJs: false,
      },
      // the constructor
      {
        name: name,
        typeToMark: null,
        type: {
          hint: "class",
          syntax: {
             self: typeReference(instanceName),
             domain: ctor ? getParameterTypes(ctor.params) : implicitCtorTypes(),
          }
        },
        isSubExport: false,
        isMainExport: false,
        existsInJs: ctor && !el.abstract,
      }
    ];
  }
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const noToken = (_: t.Node) => [];

const reduceTokens = (l: t.Statement[]): ContractToken[] => {
  const tokens = l.reduce(
    (acc: ContractToken[], el) => acc.concat(getContractTokens(el)),
    []
  );
  return markExports(tokens);
};

const getContractTokens = (el: t.Node): ContractToken[] => {
  const fn = tokenMap[el.type] || noToken;
  if (fn === noToken) { console.log("NO TOKEN", el.type); }
  const ts = fn(el);
  return fn(el);
};
// }}}

// Construct an Environment from the Tokens {{{
interface ContractNode {
  name: string;
  dependencies: string[];
  types: TypescriptType[];
  isRecursive: boolean;
  isSubExport: boolean;
  isMainExport: boolean;
}

type ContractGraph = Record<string, ContractNode>;

const getReferenceDeps = (ref: t.TSTypeReference): string => {
  return getTypeName(ref.typeName);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DepMapper = Record<string, (el: any) => string[]>;

const depMap: DepMapper = {
  TSTypeReference(type: t.TSTypeReference) {
    return [getReferenceDeps(type)];
  },
  TSFunctionType(type: t.TSFunctionType) {
    if (!type.typeAnnotation) return [];
    return getTypeDependencies({
      hint: "function",
      syntax: {
        self: null,
        domain: getParameterTypes(type.parameters),
        range: type.typeAnnotation.typeAnnotation,
      },
    });
  },
  TSUnionType(type: t.TSUnionType) {
    return type.types.flatMap(getDeps);
  },
  TSArrayType(type: t.TSArrayType) {
    return getTypeDependencies({hint: "flat", syntax: type.elementType});
  },
  TSReadonlyArrayType(type: t.TSArrayType) {
    return getTypeDependencies({hint: "flat", syntax: type.elementType});
  },
};

const getDeps = (type: t.TSType): string[] => {
  const fn = depMap[type.type];
  if (!fn) return [];
  return fn(type);
};

const getTypeDependencies = (type: TypescriptType): string[] => {
  switch (type.hint) {
    case "flat": 
       return getDeps(type.syntax as t.TSType);
    case "function": {
       const syntax = type.syntax as FunctionSyntax;
       return [
         ...syntax.domain.flatMap((stx) => getDeps(stx.type)),
         ...getDeps(syntax.range),
       ];
    }
   case "class": {
       const syntax = type.syntax as ClassSyntax;
       return [
         ...syntax.domain.flatMap((stx) => getDeps(stx.type))
       ];
    }
    default: {
       const syntax = type.syntax as ObjectSyntax;
       return Object.values(syntax.types).flatMap((type) => getDeps(type.type));
    }
   }
};

const getDependencies = (types: TypescriptType[]): string[] =>
  Array.from(new Set(types.flatMap(getTypeDependencies)));

const getNodeTypes = (tokens: ContractToken[]): TypescriptType[] => {
  const baseTypes = tokens
    .filter((token) => token.type !== null)
    .map((token) => token.type) as TypescriptType[];
  return baseTypes;
};

const filterRedundantTypes = (
  name: string,
  types: TypescriptType[]
): TypescriptType[] => {
  return types.filter((type) => {
    if (type.hint !== "flat") return true;
    if (type.syntax.type !== "TSTypeReference") return true;
    const contractName = getContractName(getTypeName(type.syntax.typeName));
    return contractName !== getContractName(name);
  });
};

const buildNode = (nodeName: string, tokens: ContractToken[]): ContractNode => {
  const nodeTokens = tokens.filter((token) => token.name === nodeName);
  const isSubExport = nodeTokens.some((token) => token.isSubExport);
  const isMainExport = nodeTokens.some((token) => token.isMainExport);
  const types = getNodeTypes(nodeTokens);
  return {
    name: nodeName,
    isSubExport,
    isMainExport,
    isRecursive: false,
    types: filterRedundantTypes(nodeName, types),
    dependencies: getDependencies(types),
  };
};

const fixDependencyNames = (graph: ContractGraph): ContractGraph => {
  const nameList = Object.keys(graph);
  const nameSet = new Set(nameList);
  return Object.entries(graph).reduce((acc, [name, node]) => {
    const dependencies = node.dependencies
      .map((dep) => {
        if (nameSet.has(dep)) return dep;
        const realName = nameList.find((name) => name.endsWith(dep));
        return realName;
      })
      .filter((dep) => dep && dep !== node.name);
    return {
      ...acc,
      [name]: {
        ...node,
        dependencies,
      },
    };
  }, {});
};

const getContractGraph = (tokens: ContractToken[]): ContractGraph => {
  const names = Array.from(new Set(tokens.map((token) => token.name)));
  return fixDependencyNames(
    names.reduce((acc: ContractGraph, el) => {
      return {...acc, [el]: buildNode(el, tokens)};
    }, {})
  );
};
// }}}

// Transform the Environment into an AST {{{

// Boundary Management - Exports, Requires {{{
const getFinalName = (name: string): string => {
  if (classDeclarations.has(name)) { 
     return classContractTypeName(name);
  } else {
     return name.includes(".")
       ? name.substring(name.lastIndexOf(".") + 1, name.length)
       : name;
  }
};

const getContractName = (name: string): string =>
  `${getFinalName(name)}Contract`;

export const ORIGINAL_MODULE_FILE = "./__ORIGINAL_UNTYPED_MODULE__.js";

function generateSuperClassTableDeclaration() : t.Statement[] {
    return [
	template.statement(`const ScottyCTInstanceTable = new Map();`)({}),
	template.statement(`ScottyCTInstanceTable.add = function(clazz, ctc) { ScottyCTInstanceTable.set(clazz,ctc); return ctc }`)({})
    ];
}

const requireContractLibrary = (): t.Statement[] => [
  template.statement(`var CT = require('./__REPLACE_ME__.js')`)({
    CT: t.identifier("CT"),
  }),
  template.statement(`var originalModule = require(%%replacementName%%)`)({
    replacementName: t.stringLiteral(ORIGINAL_MODULE_FILE),
  }),
];

const getModuleExports = (nodes: ContractNode[]): t.Statement => {
  const mainExport = nodes.find((node) => node.isMainExport);
  return mainExport
    ? template.statement(`module.exports = %%contract%%.wrap(originalModule)`)({
      contract: getContractName(mainExport.name),
    })
    : template.statement(`module.exports = originalModule;`)({});
};

const getSubExport = (node: ContractNode): t.Statement =>
  template.statement(
    `module.exports.%%name%% = %%contract%%.wrap(originalModule.%%name%%)`
  )({
    name: node.name,
    contract: getContractName(node.name),
  });

const exportContracts = (nodes: ContractNode[]): t.Statement[] => {
  const moduleExports = getModuleExports(nodes);
  const subExports = nodes.filter((node) => node.isSubExport).map(getSubExport);
  return [moduleExports, ...subExports];
};
// }}}

// Map Node to Contract {{{

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const makeAnyCt = (_?: t.TSType) =>
  template.expression(`CT.anyCT`)({CT: t.identifier("CT")});

const makeUnsupportedCt = (_?: t.TSType) =>
  template.expression(`CT.unsupportedCT`)({CT: t.identifier("CT")});

const makeCtExpression = (name: string): t.Expression =>
  template.expression(name)({CT: t.identifier("CT")});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FlatContractMap = Record<string, (type?: any) => t.Expression>;

const wrapRecursive = (expr: t.Expression): t.Expression =>
  template.expression(`%%contract%%`)({
    contract: expr,
  });

const nameReference = (refName: string): t.Expression => {
  return template.expression(`CT.CTRec(() => %%name%%)`)({
    name: getContractName(refName),
  });
};

const nodejsReference = (refName: string): t.Expression => {
  return  makeCtExpression(`CT.nodejsCT("${refName}")`);
};

const classReference = (refName: string): t.Expression => {
  return template.expression(`CT.CTRec(() => %%name%%)`)({
    name: instanceContractTypeName(refName) + "Contract",
  });
};

const extractRefParams = (ref: t.TSTypeReference): t.TSType[] => {
  const params = ref?.typeParameters?.params;
  if (!Array.isArray(params)) {
    return [];
  }
  return params;
};

const makeReduceNode = (env: ContractGraph) => {
  const typeIsInEnvironment = (typeName: string): boolean => {
    if (env[typeName]) return true;
    return Object.keys(env).some((key) => key.match(`.${typeName}`));
  };

  const giveUpOnReference = (ref: t.TSTypeReference): t.Expression => {
    console.log(
      `We gave up on this type: `,
      prettier.format(JSON.stringify(ref), {parser: "json"})
    );
    return makeUnsupportedCt();
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleUnknownReference = (ref: t.TSTypeReference) => {
    const typeName = getTypeName(ref.typeName);
    if (classDeclarations.has(typeName)) return classReference(typeName);
    if (typeIsInEnvironment(typeName)) return nameReference(typeName);
    if (typeName.match(/NodeJS[.]/)) return nodejsReference(typeName);
    return giveUpOnReference(ref);
  };

  const unwrapTypeParams = (
    ref: t.TSTypeReference,
    expr: string
  ): t.Expression => {
    const params = extractRefParams(ref);
    return template.expression(expr)({
      contract:
        params.length === 1
          ? mapFlat(params[0])
          : template.expression(`CT.CTOr(%%ors%%)`)({
            ors: params.map((param) => mapFlat(param)),
          }),
    });
  };

  const typeRefMap: Record<string, (ref: t.TSTypeReference) => t.Expression> = {
    Array(ref) {
      return unwrapTypeParams(ref, "CT.CTArray(%%contract%%)");
    },
    ReadonlyArray(ref) {
      return unwrapTypeParams(ref, "CT.CTArray(%%contract%%)");
    },
    ArrayLike(ref) {
      return unwrapTypeParams(
        ref,
        `CT.CTObject({ length: CT.numberCT, prop: { contract: %%contract%%, index: "string" } })`
      );
    },
    ArrayBuffer(_) {
      return template.expression(`CT.arrayBufferCT`)({
        CT: t.identifier("CT"),
      });
    },
    Promise(ref) {
      return unwrapTypeParams(
        ref,
        "CT.CTPromise(CT.CTFunction(true, [%%contract%%], CT.anyCT))"
      );
    },
    String(_) {
      return makeCtExpression("CT.StringCT");
    },
    Number(_) {
      return makeCtExpression("CT.NumberCT");
    },
    Boolean(_) {
      return makeCtExpression("CT.BooleanCT");
    },
    Object(_) {
      return makeCtExpression("CT.ObjectCT");
    },
    Symbol(_) {
      return makeCtExpression("CT.SymbolCT");
    },
    BigInt(_) {
      return makeCtExpression("CT.BigIntCT");
    },
    RegExp(_) {
      return makeCtExpression("CT.RegExpCT");
    },
    Error(_) {
      return makeCtExpression("CT.errorCT");
    },
    Event(_) {
      return makeCtExpression("CT.eventCT");
    },
    Buffer(_) {
      return makeCtExpression("CT.bufferCT");
    },
    Date(_) {
      return makeCtExpression("CT.dateCT");
    },
    Function(_) {
      return makeCtExpression("CT.functionCT");
    },
  };

  const flatContractMap: FlatContractMap = {
    TSNumberKeyword() {
      return makeCtExpression("CT.numberCT");
    },
    TSBooleanKeyword() {
      return makeCtExpression("CT.booleanCT");
    },
    TSStringKeyword() {
      return makeCtExpression("CT.stringCT");
    },
    TSNullKeyword() {
      return makeCtExpression("CT.nullCT");
    },
    TSVoidKeyword() {
      return makeCtExpression("CT.undefinedCT");
    },
    TSArrayType(arr: t.TSArrayType) {
      return template.expression(`CT.CTArray(%%contract%%)`)({
        contract: mapFlat(arr.elementType),
      });
    },
    TSReadonlyArrayType(arr: t.TSArrayType) {
      return template.expression(`CT.CTArray(%%contract%%)`)({
        contract: mapFlat(arr.elementType),
      });
    },
    TSTypeReference(ref: t.TSTypeReference) {
      if (ref?.typeName?.type !== "Identifier")
        return handleUnknownReference(ref);
      const {name} = ref.typeName;
      const refFn = typeRefMap[name] || handleUnknownReference;
      return refFn(ref);
    },
    TSParenthesizedType(paren: t.TSParenthesizedType) {
      return mapFlat(paren.typeAnnotation);
    },
    TSUnionType(union: t.TSUnionType) {
      return template.expression(`CT.CTOr(%%types%%)`)({
        types: union.types.map(mapFlat),
      });
    },
    TSFunctionType(type: t.TSFunctionType) {
      return mapFunction({
        self: (<TSMethodType>type).self ? (<TSMethodType>type).self : null,
        domain: getParameterTypes(type.parameters),
        range: type.typeAnnotation?.typeAnnotation || t.tsAnyKeyword(),
      });
    },
    TSTypeOperator(type: t.TSTypeOperator) {
      const base = mapFlat(type.typeAnnotation);
      if (base.type !== "CallExpression") return makeAnyCt();
      base.arguments.push(template.expression(`{ immutable: true }`)({}));
      return base;
    },
    TSTypeLiteral(type: t.TSTypeLiteral) {
      if (isLiteralObject(type))
        return mapObject({
          isRecursive: false,
          types: makeObjectLiteral(type),
        });
      return makeAnyCt();
    },
  };

  const flowContractMap: FlatContractMap = {
    NumberTypeAnnotation(_: t.NumberTypeAnnotation) {
      return makeCtExpression("CT.numberCT");
    },
    BooleanTypeAnnotation(_: t.BooleanTypeAnnotation) {
      return makeCtExpression("CT.booleanCT");
    },
    StringTypeAnnotation(_: t.StringTypeAnnotation) {
      return makeCtExpression("CT.stringCT");
    },
  };

  const mapFlat = (type: t.TSType | t.FlowType): t.Expression => {
    const tsFn = flatContractMap[type.type];
    if (tsFn !== undefined) {
      return tsFn(type);
    }
    const flowFn = flowContractMap[type.type];
    if (flowFn !== undefined) {
      return flowFn(type);
    }
    return makeAnyCt(type as t.TSType);
  };

  const makeRestParameter = (rest: t.TSType): t.Expression => {
    if (rest.type !== "TSArrayType") 
      return template.expression(`{ contract: CT.anyCT, dotdotdot: true }`)({CT: t.identifier("CT")});
    return template.expression(`{ contract: %%contract%%, dotdotdot: true }`)({
      contract: mapFlat(rest.elementType),
    });
  };

  const makeOptionalParameter = (optional: t.TSType): t.Expression => {
    return template.expression(`{contract: %%contract%%, optional: true}`)({
      contract: mapFlat(optional),
    });
  };

  const mapDomain = (
    domain: FunctionParameter[]
  ): t.Expression[] | t.Expression => {
    return template.expression(`%%contracts%%`)({
      contracts: t.arrayExpression(
        domain.map((el) => {
          if (el.isRestParameter) return makeRestParameter(el.type);
          if (el.isOptional) return makeOptionalParameter(el.type);
          return mapFlat(el.type);
        })
      ),
    });
  };

  function mapSelf(self: any) {
    return self === null ? "CT.trueCT" : mapFlat(self);
  }

  const mapFunction = (stx: FunctionSyntax) => {
    return template.expression(
      `CT.CTFunction(%%self%%, %%domain%%, %%range%%)`
    )({
      self: mapSelf(stx.self),
      domain: mapDomain(stx.domain),
      range: mapFlat(stx.range),
    });
  };

  const mapClass = (stx: ClassSyntax) => {
    return template.expression(
      `CT.CTClass(%%self%%, %%domain%%)`
    )({
      self: mapSelf(stx.self),
      domain: mapDomain(stx.domain)
    });
  };

  const getObjectTemplate = (stx: ObjectSyntax) => {
    if (stx.prototypes && stx.clazz) {
       return `ScottyCTInstanceTable.add(
                originalModule.${stx.clazz},
                CT.CTInstance("${stx.clazz}",
                              { ${Object.keys(stx.types)
                                   .map((key) => `${key}: %%${key}%%`)
                                   .join(", ")} },
                              { ${Object.keys(stx.prototypes)
                                   .map((key) => `${key}: %%${key}%%`)
                                   .join(", ")} },
                              originalModule.${stx.clazz} || originalModule,
                              ScottyCTInstanceTable.get((originalModule.${stx.clazz} || originalModule).__proto__)))`;
    } else {
       return `CT.CTRec(() => CT.CTObject({ ${Object.keys(stx.types)
                .map((key) => `${key}: %%${key}%%`)
                .join(", ")} }))`;
    }
  }

  type ObjectContracts = Record<string, t.Expression>;

  type ChunkEntry = [name: string, type: ObjectChunk];

  const addOptionalType = (
    acc: ObjectContracts,
    [name, type]: ChunkEntry
  ): ObjectContracts => {
    return {
      ...acc,
      [name]: template.expression(`{ contract: %%contract%%, optional: true }`)(
        {
          contract: mapFlat(type.type),
        }
      ),
    };
  };

  const addIndexType = (
    acc: ObjectContracts,
    [name, type]: ChunkEntry
  ): ObjectContracts => {
    return {
      ...acc,
      [name]: template.expression(
        `{ contract: %%contract%%, index: "string" }`
      )({
        contract: mapFlat(type.type),
      }),
    };
  };

  const getObjectContracts = (stx: ObjectSyntax): ObjectContracts => {
    let types = Object.entries(stx.types);
    if (stx.prototypes) {
      types = types.concat(Object.entries(stx.prototypes));
    }
    return types.reduce((acc, chunkEntry) => {
      const [name, type] = chunkEntry;
      if (type.isOptional) return addOptionalType(acc, chunkEntry);
      if (type.isIndex) return addIndexType(acc, chunkEntry);
      return {...acc, [name]: mapFlat(type.type)};
    }, {});
  };

  const buildObjectContract = (stx: ObjectSyntax) => {
    const templateString = getObjectTemplate(stx);
    const templateObject = getObjectContracts(stx);
    if (Object.keys(templateObject).length <= 0) return makeAnyCt();
    return template.expression(templateString)(templateObject);
  };

  const mapObject = (stx: ObjectSyntax) => {
    const objectContract = buildObjectContract(stx);
    return stx.isRecursive ? wrapRecursive(objectContract) : objectContract;
  };

  const mapType = (type: TypescriptType): t.Expression => {
    if (type.hint === "flat") return mapFlat(type.syntax);
    if (type.hint === "function") return mapFunction(type.syntax);
    if (type.hint === "class") return mapClass(type.syntax);
    return mapObject(type.syntax);
  };

  const mapAndContract = (types: TypescriptType[]): t.Expression =>
    template.expression(`CT.CTAnd(%%contracts%%)`)({
      contracts: types.map(mapType),
    });

  const mapNodeTypes = (node: ContractNode): t.Expression => {
    if (node.types.length === 0) return makeAnyCt();
    if (node.types.length === 1) return mapType(node.types[0]);
    return mapAndContract(node.types);
  };

  const buildContract = (node: ContractNode): t.Expression => {
    const contract = mapNodeTypes(node);
    return node.isRecursive ? wrapRecursive(contract) : contract;
  };

  const reduceNode = (node: ContractNode): t.Statement =>
    template.statement(`var %%name%% = %%contract%%`)({
      name: getContractName(node.name),
      contract: buildContract(node),
    });

  return reduceNode;
};
// }}}

const compileTypes = (
  nodes: ContractNode[],
  graph: ContractGraph
): t.Statement[] => {
  const reduceNode = makeReduceNode(graph);
  return nodes.map(reduceNode);
};

const getContractAst = (graph: ContractGraph): t.File => {
  const ast = parse("");
  const statements = markGraphNodes(graph) as ContractNode[];
  ast.program.body = [
    ...requireContractLibrary(),
    ...generateSuperClassTableDeclaration(),
    ...compileTypes(statements, graph),
    ...exportContracts(statements),
  ];
  return ast;
};
// }}}

// Main {{{
interface CompilerOptions {
  fileName: string;
  language: ParserPlugin;
}

const compile = (input: CompilerInput): string => {
  const declarationAst = getAst(input);
  const tokens = getContractTokens(declarationAst);
  const graph = getContractGraph(tokens);
  const contractAst = getContractAst(graph);
  return getCode(contractAst);
};

const DEFAULT_OPTIONS: CompilerOptions = {
  fileName: "index.d.ts",
  language: "typescript",
};

const compileContracts = (options: CompilerOptions = DEFAULT_OPTIONS): string =>
  compile({
    language: options.language,
    code: readTypesFromFile(options.fileName),
  });

export default compileContracts;
// }}}
