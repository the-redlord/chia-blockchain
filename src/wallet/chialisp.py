from clvm_tools.NodePath import NodePath


def sexp(*argv):
    return f'({f" ".join([str(arg) for arg in argv])})'


def cons(a, b):
    return sexp('c', a, b)


def first(obj):
    return sexp('f', obj)


def rest(obj):
    return sexp('r', obj)


def nth(obj, *path):
    if not path:
        return obj
    if path[0] == 0:
        return nth(first(obj), *path[1:])
    else:
        return nth(rest(obj), *(path[0]-1,) + path[1:])


def args(*path, p=NodePath()):
    if len(path) == 0:
        return str(p.as_short_path())
    if path[0] == 0:
        return args(*path[1:], p=p.first())
    else:
        return args(*(path[0] - 1,) + path[1:], p=p.rest())


def eval(code, env=args()):
    return sexp(cons(code, env))


def apply(name, argv):
    return sexp(*[name] + list(argv))


def quote(obj):
    return sexp('q', obj)


nil = quote(sexp())


def make_if(predicate, true_expression, false_expression):
    return eval(apply('i', [predicate,
                            quote(true_expression),
                            quote(false_expression)]))


def make_list(*argv, terminator=nil):
    if len(argv) == 0:
        return terminator
    else:
        return cons(argv[0],
                    make_list(*argv[1:], terminator=terminator))


def fail(*argv):
    return apply('x', argv)


def sha256(*argv):
    return apply('sha256', argv)


def sha256tree(*argv):
    return apply('sha256tree', argv)


def equal(*argv):
    return apply('=', argv)


def multiply(*argv):
    return apply('*', argv)


def add(*argv):
    return apply('+', argv)


def subtract(*argv):
    return apply('-', argv)


def is_zero(obj):
    return equal(obj, quote('0'))


def hexstr(str):
    return quote("0x" + str)