#!/bin/bash
#===============================================================================
#
#          FILE:  lunchSigLogServers.sh
# 
#         USAGE:  ./lunchSigLogServers.sh 
# 
#   DESCRIPTION:  
# 
#       OPTIONS:  ---
#  REQUIREMENTS:  ---
#          BUGS:  ---
#         NOTES:  ---
#        AUTHOR:  Raziel Carvajal-Gomez (), raziel.carvajal-gomez@inria.fr
#       COMPANY:  INRIA, Rennes
#       VERSION:  1.0
#       CREATED:  06/02/2015 09:55:31 CET
#      REVISION:  ---
#===============================================================================
here=`pwd`
cd ../examples/middleware2014
node server.js 9990 4 >/dev/null &
cd $here
cd ../src
node LoggingServer.js 9991 >log &
