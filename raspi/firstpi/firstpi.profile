# ~/.profile: executed by the command interpreter for login shells.
# This file is not read by bash(1), if ~/.bash_profile or ~/.bash_login
# exists.
# see /usr/share/doc/bash/examples/startup-files for examples.
# the files are located in the bash-doc package.

# the default umask is set in /etc/profile; for setting the umask
# for ssh logins, install and configure the libpam-umask package.
#umask 022

export TABSIZE=4
export CRED='\e[31m'
export CGRN='\e[32m'
export CYWL='\e[33m'
export CMGT="\e[35m"
export CCYN="\e[36m"
export CWTE="\e[37m"
export CCLR='\e[0m'

# if running bash
if [ -n "$BASH_VERSION" ]; then
    # include .bashrc if it exists
    if [ -f "$HOME/.bashrc" ]; then
	. "$HOME/.bashrc"
    fi
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/bin" ] ; then
    PATH="$HOME/bin:$PATH"
fi

# set PATH so it includes user's private bin if it exists
if [ -d "$HOME/.local/bin" ] ; then
    PATH="$HOME/.local/bin:$PATH"
fi

export PATH=$PATH:/usr/local/go/bin
alias ll='ls -al'

hname=$(hostname)
haddr=$(hostname -i)
PS1="[\u@${CRED}${hname}${CCLR}:${haddr} \W]\$ "

################################################################
export DEVEL_HOME=$HOME/new-horizons
export DEVEL_PATH=$DEVEL_HOME
export DEVEL_BIN=$DEVEL_HOME/bin
export DEVEL_CFG=$DEVEL_HOME/cfg
export DEVEL_LOG=$DEVEL_HOME/log

################################################################
export DEVEL_GO_HOME=$DEVEL_HOME/go-dev.v2
export DEVEL_GO_BIN=$DEVEL_GO_HOME/bin
export DEVEL_GO_CFG=$DEVEL_GO_HOME/cfg
export DEVEL_GO_LOG=$DEVEL_GO_HOME/log
export EXTERN_CFG=$HOME/new-horizons-conf
export PATH=$PATH:/usr/local/go/bin:.:$DEVEL_BIN


################################################################
# For upload file to slack (MyFirstPI to new-horizons)
export SLACK_BOT_TOKEN="xoxb-1634287164039-6712797519491-ZV7SazF0PoSgkkHneha799BH"

################################################################
#export DISPLAY=:0

alias mydb='mysql --table --host=0.0.0.0 --port=3306 --user=stock -pmy@raspberry2 stock' # my@raspberery2
alias mydbdump='mysqldump --login-path=stock --column-statistics=0 stock > stock.dump'

alias cddev='cd $DEVEL_GO_HOME'
alias cdbin='cd $DEVEL_BIN'
alias cdcfg='cd $DEVEL_CFG'
alias cdlog='cd $DEVEL_LOG' 

alias curtemp='cat /sys/class/thermal/thermal_zone0/temp'
alias grafanapw='echo admin/my@raspberry2'

alias usbon='sudo uhubctl  -l 2 -a on'
alias usboff='sudo uhubctl -l 2 -a off'

alias monitoron='export DISPLAY=:0; xset dpms force on'
alias monitoroff='export DISPLAY=:0; xset dpms force off'

alias cdsql='cd /home/pi/new-horizons/go-dev.v2/report/stock'
