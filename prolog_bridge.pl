:- use_module(library(http/json)).
:- consult('seat.pl').

solve_from_json :-
    json_read_dict(current_input, Dict),
    convert_rooms(Dict.rooms, Rooms),
    (   _ = Dict.get(students)
    ->  convert_students(Dict.students, Students)
    ;   convert_groups(Dict.groups, Groups),
        generate_students(Groups, Students)
    ),
    (   solve(Students, Rooms, Arrangement)
    ->  format_assignments(Arrangement, JsonAssignments),
        length(Students, Count),
        Result = _{
            success: true,
            students_count: Count,
            assignments: JsonAssignments
        }
    ;   Result = _{
            success: false,
            message: "No valid seating arrangement found satisfying all constraints."
        }
    ),
    json_write_dict(current_output, Result),
    nl.

convert_students([], []).
convert_students([S|Rest], [student(IDAtom, ClassAtom, BranchAtom)|ConvertedRest]) :-
    atom_string(IDAtom, S.id),
    atom_string(ClassAtom, S.class),
    atom_string(BranchAtom, S.branch),
    convert_students(Rest, ConvertedRest).

convert_rooms([], []).
convert_rooms([R|Rest], [room(R.room, R.rows, R.cols, Blocked)|ConvertedRest]) :-
    Blocked = R.blocked,
    convert_rooms(Rest, ConvertedRest).

convert_groups([], []).
convert_groups([G|Rest], [group(ClassAtom, BranchAtom, G.count)|ConvertedRest]) :-
    atom_string(ClassAtom, G.class),
    atom_string(BranchAtom, G.branch),
    convert_groups(Rest, ConvertedRest).

format_assignments([], []).
format_assignments([assignment(ID, Class, Branch, seat(Room, SeatNum, Cols))|Rest],
                   [_{id: IDStr, class: ClassStr, branch: BranchStr, room: Room, seat: SeatNum, row: Row, col: Col}|ConvertedRest]) :-
    atom_string(ID, IDStr),
    atom_string(Class, ClassStr),
    atom_string(Branch, BranchStr),
    Row is ((SeatNum - 1) // Cols) + 1,
    Col is ((SeatNum - 1) mod Cols) + 1,
    format_assignments(Rest, ConvertedRest).