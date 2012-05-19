#!/bin/bash

i# removing throws:
#  $ for i in `find . -name "*java"`; do sed -e '{1!N; s/[^@]throws[^{;]*//}' $i > $i.c; mv $i.c $i; done

what=$1
from=$2
to=$3

start="start"
ORIGINAL_BIN=../../fm.org/bin
PROPDIFF=../propdiff
DISASDIR=../disas

DIFFLOG=/home/thiago/src/java_msc/testando/scripts/diff.log
PATHLOG=/home/thiago/src/java_msc/testando/scripts/paths.log

if [ "$what" = "$start" ]; then
    echo "Cleaning database..."
    mongo java_msc --eval "db.dropDatabase();"
    rm -rf $PROPDIFF
    mkdir -p $PROPDIFF
    rm /home/thiago/src/java_msc/testando/scripts/log.log
    rm $DIFFLOG; touch $DIFFLOG;
    rm $PATHLOG; touch $PATHLOG;
fi


NODE_PATH=/usr/local/lib/node_modules/ pjavac-gen.js > freemind/Propagates.java;


###################################################


difflist=()

function in_diffs()
{
    el=$1

    for k in `seq 0 ${#difflist[*]}`; do
        if [ "${difflist[$k]}" = "$el" ]; then
            return 1
        fi
    done
    difflist=("${difflist[@]}" "$el")
    return 0
}

for i in `seq $from $to`; do

    echo "++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++"
    echo "++++++++++++++++++++++++++++++++++++++ doing $i +++++++++++++++++++++++++++++++++++++"

    echo -e "\n\n++++++++++++++++++++++++++++++++++++++ doing $i +++++++++++++++++++++++++++++++++++++\n\n" >> $PATHLOG

    #cleaning up
    rm -rf $DISASDIR
    mkdir -p $DISASDIR/mine
    mkdir -p $DISASDIR/original
    ant clean;

    #building
    ant;

    echo "Done building. Generating propagates..."

    ## generating Propagates.java
    NODE_PATH=/usr/local/lib/node_modules/ pjavac-gen.js > freemind/Propagates.java.other;
    #diff -w freemind/Propagates.java freemind/Propagates.java.other
    cp freemind/Propagates.java.other freemind/Propagates.java;
    cp freemind/Propagates.java $PROPDIFF/Propagates_$i.java;

    echo "Starting disassembly of generated classes..."
    ## disassemblying compiled classes and analysing
    for j in `find ../bin -name "*class"`; do
        name=`basename $j`

        #echo "disassembling $name..."

        dres=`diff $j $ORIGINAL_BIN/$j`

        if [ "$?" != 0 ]; then
            myclass=$DISASDIR/mine/$name
            orgclass=$DISASDIR/original/$name

            javap $j > $myclass

            javap $ORIGINAL_BIN/$j > $orgclass

            #echo "Diffing $j"
            diffres=`diff $myclass $orgclass`
            if [ "$?" = 0 ]; then
                echo "WTF!?!?!?!?!? class differed but disassembled is identical!!! [$i] $j"
#                break 2
            else
                #mine is <
                #original is >
                echo "$diffres" | grep "<.*throws" > /dev/null
                if [ "$?" = 0 ]; then

                    #mine has throws!
                    #check for duplicates

                    in_diffs "$j"
                    if [ "$?" = 0 ]; then
                         echo "===== >> We are throwing different stuff!! $j"
                         echo "$diffres"
                         echo "===== >> We are throwing different stuff!! $j"
                         echo "=========== [seq $i] $j ==============
$diffres
----------- [seq $i] $j --------------

" >> $DIFFLOG
                    fi
                else
                    echo "$name is OK"
                    echo "$diffres"
                fi
            fi
        fi
    done
done
